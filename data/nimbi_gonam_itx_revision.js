/* 한강로-고남-전주/순천 ITX-마음 정식 시간표 (2026-10-08)
 * 인게임 사진 #220014/#220016의 운전시분을 분 단위로 버림해 옮겼다.
 * 0초 정차는 통과로 처리하고 통과역 승강장은 저장하지 않는다.
 */
(()=>{
  if(typeof ALL_TRAINS==='undefined')return;
  const target=no=>Number(no)>=1981&&Number(no)<=1998;
  for(let i=ALL_TRAINS.length-1;i>=0;i--)if(target(ALL_TRAINS[i].no))ALL_TRAINS.splice(i,1);
  const c=n=>`${Math.floor((n%1440+1440)%1440/60)}:${String((n%60+60)%60).padStart(2,'0')}`;
  const stop=(s,arr,dep,p)=>({s,arr,dep,...(p==null?{}:{p:String(p)})});
  const pass=(s,arr)=>({s,arr,dep:null});

  // 사진 220014: 06:00 한강로 출발을 0분으로 한 상대시각.
  const jeonjuDown=[
    stop('한강로',null,0,9),stop('수원',17,19,4),stop('오산',26,27,8),
    stop('천안',45,47,3),stop('아산',53,55,3),stop('합덕',66,68,3),
    stop('당진',75,77,6),pass('승산',80),stop('서산',87,89,2),stop('태안',95,97,1),
    pass('남면',101),pass('창기',106),stop('안면도',109,110,1),stop('고남',116,117,1),
    stop('보령',127,128,1),stop('서천',142,144,1),stop('군산',149,151,3),pass('대야',155),
    stop('익산',161,163,2),stop('삼례',168,170,1),stop('전주',175,null,7)
  ];
  // 사진의 상행 승강장(방위문자 제거). 운전시분은 상행 원본이 끝에서 잘려
  // 완전한 하행을 역산하라는 규칙에 따라 하행 구간시분을 역산한다.
  const upPlatforms={전주:7,삼례:2,익산:5,군산:4,서천:2,보령:2,고남:2,안면도:2,태안:2,서산:2,당진:5,합덕:2,아산:4,천안:4,오산:2,수원:4,한강로:9};
  const reverse=(template,platforms)=>{
    const total=template.at(-1).arr;
    return template.slice().reverse().map((x,i,a)=>{
      const first=i===0,last=i===a.length-1,isPass=x.dep==null&&x!==template.at(-1);
      if(isPass)return pass(x.s,x.arr==null?null:total-x.arr);
      return stop(x.s,first?null:total-x.dep,last?null:total-x.arr,platforms[x.s]);
    });
  };
  const jeonjuUp=reverse(jeonjuDown,upPlatforms);

  // 사진 220016. 전주까지의 초 단위 값도 220014와 별개로 직접 버림했다.
  const suncheonDown=[
    stop('한강로',null,0,9),stop('수원',17,19,4),stop('오산',26,27,8),
    stop('천안',45,47,3),stop('아산',53,55,3),stop('합덕',67,68,3),
    stop('당진',76,77,6),pass('승산',81),stop('서산',88,90,2),stop('태안',96,98,1),
    pass('남면',102),pass('창기',107),stop('안면도',110,111,1),stop('고남',117,118,1),
    stop('보령',128,129,1),stop('서천',143,145,1),stop('군산',150,152,3),pass('대야',157),
    stop('익산',163,164,2),stop('삼례',170,171,1),stop('전주',177,178,7),
    pass('운암',187),stop('임실',192,194,1),stop('오수',199,201,1),
    stop('남원',208,209,1),stop('구례',220,222,1),pass('황전',226),
    pass('북순천',233),stop('순천',239,null,6)
  ];
  // 사진 #1994의 실제 상행 운전시분. 하행 역산값을 쓰지 않고 사진의 초를
  // 버린 분 단위 값을 순천 출발 기준 상대시각으로 옮긴다. 사진 속 0초
  // 정차(승산·남면·창기)는 통과로 처리하고 승강장은 저장하지 않는다.
  const suncheonUp=[
    stop('순천',null,0,6),pass('북순천',2),pass('황전',9),stop('구례',13,14,4),
    stop('남원',25,27,4),stop('오수',34,35,2),stop('임실',41,42,2),pass('운암',47),
    stop('전주',56,58,6),stop('삼례',63,65,2),stop('익산',70,72,5),pass('대야',78),
    stop('군산',82,84,4),stop('서천',90,91,2),stop('보령',105,107,2),
    stop('고남',116,118,2),stop('안면도',123,125,2),pass('창기',128),pass('남면',133),
    stop('태안',137,138,2),stop('서산',145,146,1),pass('승산',153),
    stop('당진',157,159,5),stop('합덕',166,168,2),stop('아산',179,181,4),
    stop('천안',187,189,4),stop('오산',207,209,2),stop('수원',215,217,6),
    stop('한강로',236,null,9)
  ];

  function makeStops(template,start){
    return template.map((x,i,a)=>{
      const last=i===a.length-1,isPass=!last&&x.dep==null;
      const out={s:x.s,arr:i===0?null:(x.arr==null?null:c(start+x.arr)),dep:last||isPass?null:c(start+x.dep)};
      if(x.p!=null&&!isPass)out.p=x.p;
      return out;
    });
  }
  function add(no,from,to,line,template,start,dir){
    ALL_TRAINS.push({no:String(no),dest:to,dir,line,grade:'ITX-마음',boundary:[from,to],stops:makeStops(template,start)});
  }
  // 통합 115분 간격. 9왕복을 유지하면서 첫차 05시 이후·막차 00:30 이전을
  // 동시에 만족할 수 있는 가장 가까운 2시간급 균등 간격이다.
  const plan=[
    [1981,1982,'전주',jeonjuDown,jeonjuUp,300],
    [1991,1992,'순천',suncheonDown,suncheonUp,415],
    [1983,1984,'전주',jeonjuDown,jeonjuUp,530],
    [1993,1994,'순천',suncheonDown,suncheonUp,645],
    [1985,1986,'전주',jeonjuDown,jeonjuUp,760],
    [1995,1996,'순천',suncheonDown,suncheonUp,875],
    [1987,1988,'전주',jeonjuDown,jeonjuUp,990],
    [1997,1998,'순천',suncheonDown,suncheonUp,1105],
    [1989,1990,'전주',jeonjuDown,jeonjuUp,1220]
  ];
  // 기존 전 편과 사진 승강장까지 대조해 같은 승강장 동시 점유를 없앤
  // 편별 최소 이동값. 구간 운전시분은 바꾸지 않고 전체 시각을 평행 이동한다.
  const adjust={1984:3,1986:4,1987:6,1988:-3,1989:15,1990:15,1991:-4,1992:1,1993:1,1996:-5,1997:9};
  for(const [downNo,upNo,end,down,up,start] of plan){
    const line=end==='순천'?'경부선·태안선·장항선·전라선':'경부선·태안선·장항선';
    add(downNo,'한강로',end,line,down,start+(adjust[downNo]||0),'down');
    // 양방향을 같은 초에 출발시키면 태안선 단선 승강장에서 정면 중복이
    // 생기므로 상행만 5분 늦춘다(양단 첫막차 균형은 유지).
    add(upNo,end,'한강로',line,up,start+5+(adjust[upNo]||0),'up');
  }
  ALL_TRAINS.sort((a,b)=>Number(a.no)-Number(b.no));
})();
