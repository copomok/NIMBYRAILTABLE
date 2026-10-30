/* 2026-10-30 인게임 사진 재판독 및 경의선 일반열차 보강 */
(()=>{
  if(typeof ALL_TRAINS==='undefined')return;
  const timed=value=>/^\d{1,2}:\d{2}$/.test(value||'');
  const minute=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
  const clock=value=>{const n=(value%1440+1440)%1440;return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  const makeStops=(template,start)=>template.map((entry,index,array)=>{
    const pass=entry.dep==null&&index>0&&index<array.length-1;
    const stop={
      s:entry.s,
      arr:index===0?null:clock(start+entry.arr),
      dep:index===array.length-1||pass?null:clock(start+entry.dep),
    };
    if(entry.p!=null&&!pass)stop.p=String(entry.p);
    if(entry.geoKey)stop.geoKey=entry.geoKey;
    return stop;
  });
  const replaceByCurrentDeparture=(numbers,down,up)=>{
    for(const no of numbers){
      const train=ALL_TRAINS.find(item=>item.no===String(no));
      if(!train||!timed(train.stops[0]?.dep))continue;
      const start=minute(train.stops[0].dep);
      train.stops=makeStops(train.dir==='down'?down:up,start);
    }
  };

  // 1000079480~82: 사진의 각 도착·출발 초를 따로 버려 정차시간을 보존한다.
  // 사진 밖 마지막 녕원 종착은 반대 방향 녕원–덕천 운전시분으로 역산했다.
  const nyongwonPyongyangDown=[
    {s:'녕원',arr:null,dep:0,p:2},{s:'덕천',arr:10,dep:11,p:2},
    {s:'남덕',arr:17,dep:18,p:1},{s:'송림',arr:22,dep:23,p:1,geoKey:'송림(녕원선)'},
    {s:'북창',arr:26,dep:28,p:1},{s:'구봉',arr:36,dep:37,p:2},
    {s:'은산',arr:47,dep:48,p:1},{s:'평성',arr:59,dep:60,p:5},
    {s:'배산점',arr:63,dep:64,p:1},{s:'서포',arr:73,dep:74,p:1},
    {s:'서평양',arr:78,dep:79,p:1},{s:'평양',arr:83,dep:null,p:2},
  ];
  const pyongyangNyongwonUp=[
    {s:'평양',arr:null,dep:0,p:2},{s:'서평양',arr:3,dep:5,p:4},
    {s:'서포',arr:8,dep:9,p:2},{s:'배산점',arr:18,dep:19,p:2},
    {s:'평성',arr:22,dep:23,p:6},{s:'은산',arr:34,dep:35,p:2},
    {s:'구봉',arr:45,dep:46,p:1},{s:'북창',arr:54,dep:55,p:2},
    {s:'송림',arr:59,dep:60,p:2,geoKey:'송림(녕원선)'},
    {s:'남덕',arr:64,dep:65,p:2},{s:'덕천',arr:71,dep:72,p:1},
    {s:'녕원',arr:82,dep:null,p:1},
  ];
  const nyongwonSeoulDown=[
    {s:'녕원',arr:null,dep:0,p:2},{s:'덕천',arr:9,dep:10,p:2},
    {s:'남덕',arr:15,dep:16,p:1},{s:'송림',arr:20,dep:21,p:1,geoKey:'송림(녕원선)'},
    {s:'북창',arr:24,dep:25,p:1},{s:'구봉',arr:32,dep:33,p:2},
    {s:'은산',arr:43,dep:44,p:1},{s:'평성',arr:53,dep:54,p:5},
    {s:'배산점',arr:57,dep:58,p:1},{s:'서포',arr:61,dep:62,p:1},
    {s:'서평양',arr:70,dep:71,p:1},{s:'평양',arr:74,dep:75,p:7},
    {s:'송림',arr:91,dep:92,p:4},{s:'사리원',arr:105,dep:106,p:5},
    {s:'서흥',arr:125,dep:126,p:1},{s:'평산',arr:134,dep:136,p:1},
    {s:'금천',arr:145,dep:146,p:1},{s:'개성',arr:157,dep:158,p:1},
    {s:'개성공단',arr:162,dep:163,p:1},{s:'판문',arr:165,dep:166,p:1},
    {s:'도라산',arr:170,dep:171,p:1},{s:'문산',arr:175,dep:176,p:3},
    {s:'일산',arr:185,dep:186,p:2},{s:'행신',arr:192,dep:193,p:1},
    {s:'서울',arr:200,dep:null,p:9},
  ];
  const seoulNyongwonUp=[
    {s:'서울',arr:null,dep:0,p:9},{s:'행신',arr:7,dep:8,p:2},
    {s:'일산',arr:13,dep:15,p:3},{s:'문산',arr:24,dep:25,p:4},
    {s:'도라산',arr:29,dep:30,p:2},{s:'판문',arr:33,dep:35,p:2},
    {s:'개성공단',arr:37,dep:38,p:2},{s:'개성',arr:42,dep:43,p:4},
    {s:'금천',arr:54,dep:55,p:2},{s:'평산',arr:64,dep:66,p:2},
    {s:'서흥',arr:74,dep:75,p:2},{s:'사리원',arr:94,dep:95,p:6},
    {s:'송림',arr:108,dep:109,p:1},{s:'평양',arr:124,dep:126,p:8},
    {s:'서평양',arr:129,dep:130,p:4},{s:'서포',arr:133,dep:134,p:2},
    {s:'배산점',arr:142,dep:143,p:2},{s:'평성',arr:145,dep:147,p:6},
    {s:'은산',arr:157,dep:158,p:2},{s:'구봉',arr:167,dep:168,p:1},
    {s:'북창',arr:175,dep:176,p:2},{s:'송림',arr:179,dep:181,p:2,geoKey:'송림(녕원선)'},
    {s:'남덕',arr:184,dep:185,p:2},{s:'덕천',arr:190,dep:191,p:1},
    {s:'녕원',arr:200,dep:null,p:1},
  ];
  replaceByCurrentDeparture(
    Array.from({length:20},(_,index)=>5181+index),
    nyongwonPyongyangDown,pyongyangNyongwonUp
  );
  replaceByCurrentDeparture(
    Array.from({length:12},(_,index)=>5281+index),
    nyongwonSeoulDown,seoulNyongwonUp
  );

  // 1000079398/99: 산내 정차 KTX는 총 소요시간을 임의로 고정하지 않고
  // 사진의 양방향 시각을 그대로 사용한다. 사진에 빠진 통과점은 같은
  // 경부고속선 KTX의 통상 역간 운전시분으로 배치했다.
  const sanDown=[
    {s:'서울',arr:null,dep:0},{s:'병목안',arr:7,dep:null},
    {s:'수영',arr:11,dep:12},{s:'천안',arr:25,dep:26},
    {s:'정안',arr:31,dep:null},{s:'세종',arr:37,dep:38},
    {s:'대전',arr:47,dep:48},{s:'산내',arr:51,dep:52},
    {s:'영동',arr:60,dep:61},{s:'구미',arr:72,dep:null},
    {s:'남대구',arr:84,dep:85},{s:'청도',arr:93,dep:null},
    {s:'부산',arr:110,dep:null},
  ];
  const sanUp=[
    {s:'부산',arr:null,dep:0},{s:'청도',arr:18,dep:null},
    {s:'남대구',arr:25,dep:26},{s:'구미',arr:37,dep:null},
    {s:'영동',arr:49,dep:50},{s:'산내',arr:58,dep:59},
    {s:'대전',arr:62,dep:63},{s:'세종',arr:72,dep:73},
    {s:'정안',arr:78,dep:null},{s:'천안',arr:84,dep:85},
    {s:'수영',arr:98,dep:99},{s:'병목안',arr:102,dep:null},
    {s:'서울',arr:110,dep:null},
  ];
  replaceByCurrentDeparture(
    [19,20,29,30,41,42,53,54,65,66,77,78,83,84],
    sanDown,sanUp
  );

  // 신의주–서울 KTX-산천: 사진 시각은 유지하고 문산·룡천만 통과로 정정.
  for(const train of ALL_TRAINS){
    const no=Number(train.no);
    if(no<9001||no>9018)continue;
    for(const stop of train.stops)if(stop.s==='문산'||stop.s==='룡천'){
      stop.dep=null;
      delete stop.p;
    }
  }

  // 1000079479: 신의주–평양 무궁화호 왕복 원형. 사진 밖 신의주 종착
  // 한 역은 신의주→룡천 운전시분을 역산해 137분으로 보완했다.
  const mugunghwaDown=[
    {s:'신의주',arr:null,dep:0,p:1},{s:'룡천',arr:8,dep:9,p:1},
    {s:'염주',arr:18,dep:19,p:1},{s:'동림',arr:25,dep:27,p:1},
    {s:'선천',arr:37,dep:38,p:1},{s:'곽산',arr:49,dep:50,p:1},
    {s:'정주',arr:57,dep:58,p:1},{s:'운하',arr:70,dep:71,p:1},
    {s:'운전',arr:78,dep:79,p:1},{s:'안주역전',arr:85,dep:86,p:3},
    {s:'문덕',arr:93,dep:94,p:1},{s:'금풍',arr:103,dep:104,p:1},
    {s:'평원',arr:110,dep:111,p:1},{s:'순안',arr:119,dep:120,p:1},
    {s:'서포',arr:127,dep:128,p:1},{s:'서평양',arr:131,dep:132,p:1},
    {s:'평양',arr:136,dep:null,p:1},
  ];
  const mugunghwaUp=[
    {s:'평양',arr:null,dep:0,p:2},{s:'서평양',arr:4,dep:5,p:4},
    {s:'서포',arr:8,dep:9,p:2},{s:'순안',arr:17,dep:18,p:2},
    {s:'평원',arr:26,dep:27,p:2},{s:'금풍',arr:32,dep:33,p:2},
    {s:'문덕',arr:42,dep:43,p:4},{s:'안주역전',arr:50,dep:51,p:4},
    {s:'운전',arr:58,dep:59,p:2},{s:'운하',arr:66,dep:67,p:2},
    {s:'정주',arr:79,dep:80,p:4},{s:'곽산',arr:86,dep:87,p:2},
    {s:'선천',arr:98,dep:99,p:2},{s:'동림',arr:110,dep:111,p:2},
    {s:'염주',arr:118,dep:119,p:2},{s:'룡천',arr:127,dep:129,p:2},
    {s:'신의주',arr:137,dep:null,p:2},
  ];
  const downDepartures=[353,405,469,530,594,656,721,789,856,921,982,1046,1113,1178];
  const upDepartures=[455,520,585,662,724,786,851,919,979,1042,1109,1174,1235,1304];
  for(let index=0;index<downDepartures.length;index++){
    const downNo=5401+index*2,upNo=downNo+1;
    ALL_TRAINS.push({
      no:String(downNo),dest:'평양',dir:'down',line:'경의선',grade:'무궁화호',
      boundary:['신의주','평양'],stops:makeStops(mugunghwaDown,downDepartures[index]),
    });
    ALL_TRAINS.push({
      no:String(upNo),dest:'신의주',dir:'up',line:'경의선',grade:'무궁화호',
      boundary:['평양','신의주'],stops:makeStops(mugunghwaUp,upDepartures[index]),
    });
  }

  const shiftTrain=(no,delta)=>{
    const train=ALL_TRAINS.find(item=>item.no===String(no));
    if(!train||!delta)return;
    for(const stop of train.stops)for(const key of ['arr','dep'])
      if(timed(stop[key]))stop[key]=clock(minute(stop[key])+delta);
  };
  // 인게임 원형은 유지한 채 전 편을 평행 이동해 기존 열차와의 무단추월을 피한다.
  // #5071·#5091은 신설편과의 일반열차 통합 간격을 20분 이상 확보하는 최소 조정이다.
  const shifts={
    296:-6,5065:5,5089:11,5093:-10,
    5181:2,5184:8,5187:-2,5188:1,5191:-11,5194:-9,5196:1,5198:9,5199:5,5200:-2,
    5281:8,5283:10,5284:-31,5285:-3,5286:-19,5287:-2,5288:-4,5290:7,5291:-9,
    5402:5,5405:-3,5406:2,5407:2,5408:-4,5409:2,5410:4,
    5411:-8,5412:1,5413:-2,5414:-2,5415:1,5416:-2,5418:6,5419:4,
    5420:-6,5425:-1,5427:-7,5428:-3,
  };
  for(const [no,delta]of Object.entries(shifts))shiftTrain(no,delta);

  // 두 편은 큰 폭의 평행 이동 대신 사진의 정차역에서 KTX를 대피시킨다.
  // #5403은 동림, #5424는 곽산에서 통과 열차 시각을 포함하도록 정차를 연장한다.
  const holdAfter=(no,station,minutes,occurrence=1)=>{
    const train=ALL_TRAINS.find(item=>item.no===String(no));
    const index=train?.stops
      .map((stop,index)=>stop.s===station?index:-1)
      .filter(index=>index>=0)[occurrence-1]??-1;
    if(index<0)return;
    const stop=train.stops[index];
    stop.dep=clock(minute(stop.dep)+minutes);
    for(let i=index+1;i<train.stops.length;i++)for(const key of ['arr','dep'])
      if(timed(train.stops[i][key]))train.stops[i][key]=clock(minute(train.stops[i][key])+minutes);
  };
  holdAfter(5403,'동림',15);
  holdAfter(5411,'운하',3);
  holdAfter(5424,'곽산',7);
  holdAfter(5281,'송림',4,2);

  if(Array.isArray(globalThis.NIMBI_NORTH_FORMAL_RANGES))globalThis.NIMBI_NORTH_FORMAL_RANGES.push({
    first:5401,last:5428,from:'신의주',to:'평양',line:'경의선',grade:'무궁화호',count:14,
  });
})();
