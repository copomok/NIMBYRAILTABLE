/* 북한 지역 철도 정식 개편 시간표 (2026-09-11)
 * 새 인게임 Timetable Export의 Line 운전시분과 사용자가 제공한 운행 사진만
 * 사용한다. 과거 시범 운행 열차의 시간표 데이터는 참조하지 않는다.
 */
(()=>{
  if(typeof ALL_TRAINS==='undefined'||typeof NIMBI_NORTH_INGAME_ROUTES==='undefined')return;
  const oldRanges=[[3001,3024],[3501,3528],[8001,8012],[9001,9036],[9051,9078],[9101,9114],[9521,9540],[9551,9576],[9581,9594],[9601,9614],[9701,9716],[9751,9764]];
  const old=no=>oldRanges.some(([a,b])=>no>=a&&no<=b);
  const clock=value=>{const n=(value%1440+1440)%1440;return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  const departures=(start,gap,count)=>Array.from({length:count},(_,i)=>start+i*gap);
  const aliases={통천읍:'통천',세포읍:'세포',고산읍:'고산',안변읍:'안변',고원읍:'고원',정평읍:'정평',금야읍:'금야',함주읍:'함주',은산읍:'은산',북창읍:'북창',향산읍:'향산',전천읍:'전천',성간읍:'성간',룡연읍:'룡연','강계역ㄴ':'강계',만포:'샘물동','김일성 벽화':'청단','금곡로동자구':'금곡리','Coffee Machine':'모리온','Владивосток (블라디보스토크역)':'블라디보스토크'};
  const canon=name=>aliases[name]||String(name||'').replace(/역$/,'').replace('강계역ㄴ','강계');

  function rawSegment(lineName,from,to){
    const raw=NIMBI_NORTH_INGAME_ROUTES[lineName];
    if(!raw)throw new Error(`인게임 노선 원본 없음: ${lineName}`);
    const find=(a,b)=>{for(let i=0;i<raw.length;i++)if(canon(raw[i].station)===canon(a))for(let j=i+1;j<raw.length;j++)if(canon(raw[j].station)===canon(b))return raw.slice(i,j+1);return null;};
    const direct=find(from,to);if(direct)return direct;
    const reversed=find(to,from);if(!reversed)throw new Error(`${lineName}: ${from}-${to} 구간 없음`);
    const start=reversed[0].arrival,total=reversed.at(-1).arrival-start;
    return reversed.slice().reverse().map((row,index,array)=>{const dwell=Math.max(0,row.departure-row.arrival),arrival=total-(row.departure-start);return {...row,arrival,departure:index===array.length-1?arrival:arrival+dwell,platform:oppositePlatform(canon(row.station),row.platform)};});
  }
  function fit(lineName,from,to,names){
    const raw=rawSegment(lineName,from,to),start=raw[0].arrival,anchors=[];
    for(let i=0;i<names.length;i++){
      const candidates=raw.map((row,index)=>({row,index})).filter(item=>canon(item.row.station)===canon(names[i]));
      const match=candidates.find(item=>!anchors.length||item.index>anchors.at(-1).rawIndex)||candidates[0];
      if(match)anchors.push({nameIndex:i,rawIndex:match.index,row:match.row});
    }
    if(!anchors.some(anchor=>anchor.nameIndex===0))anchors.push({nameIndex:0,rawIndex:0,row:raw[0]});
    if(!anchors.some(anchor=>anchor.nameIndex===names.length-1))anchors.push({nameIndex:names.length-1,rawIndex:raw.length-1,row:raw.at(-1)});
    anchors.sort((a,b)=>a.nameIndex-b.nameIndex);
    if(!anchors.length||anchors[0].nameIndex!==0||anchors.at(-1).nameIndex!==names.length-1)throw new Error(`${lineName}: ${from}-${to} 사진 역순서 앵커 부족`);
    return names.map((name,index)=>{
      const exact=anchors.find(anchor=>anchor.nameIndex===index);let arr,dep,p;
      if(exact){arr=Math.round((exact.row.arrival-start)/60);dep=Math.round((exact.row.departure-start)/60);p=exact.row.platform||undefined;}
      else{const left=anchors.filter(anchor=>anchor.nameIndex<index).at(-1),right=anchors.find(anchor=>anchor.nameIndex>index);const a=(left.row.departure-start)/60,b=(right.row.arrival-start)/60;arr=Math.round(a+(b-a)*(index-left.nameIndex)/(right.nameIndex-left.nameIndex));dep=null;}
      return {s:canon(name),arr:index===0?null:arr,dep:index===names.length-1?null:dep,p};
    }).map((stop,index)=>index===0?{...stop,dep:0}:stop);
  }
  function oppositePlatform(station,platform){
    if(platform==null)return platform;
    const rawAlias=Object.entries(aliases).find(([,canonical])=>canonical===station)?.[0];
    const stationDbInfo=typeof STATION_DB!=='undefined'&&(STATION_DB[station]||STATION_DB[`${station}역`]);
    const info=stationDbInfo||NIMBI_NORTH_INGAME_STATIONS[station]||NIMBI_NORTH_INGAME_STATIONS[`${station}역`]||NIMBI_NORTH_INGAME_STATIONS[rawAlias],current=Number(platform);
    const available=[...new Set((info?.platforms||[]).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
    if(available.length<2||!Number.isFinite(current))return platform;
    const paired=current%2?current+1:current-1;
    if(available.includes(paired))return String(paired);
    return String(available.filter(value=>value!==current).sort((a,b)=>Math.abs(a-current)-Math.abs(b-current))[0]??current);
  }
  function reverse(template){const total=template.at(-1).arr;return template.slice().reverse().map((stop,index,array)=>{const first=index===0,last=index===array.length-1,pass=stop.dep==null&&stop!==template.at(-1);if(pass)return {s:stop.s,arr:total-stop.arr,dep:null};return {s:stop.s,arr:first?null:total-stop.dep,dep:last?null:total-stop.arr,p:oppositePlatform(stop.s,stop.p)};});}
  function section(template,from,to){const a=template.findIndex(stop=>stop.s===from),b=template.findIndex((stop,index)=>index>=a&&stop.s===to);if(a<0||b<a)throw new Error(`구간 없음: ${from}-${to}`);const origin=template[a].arr??template[a].dep??0;return template.slice(a,b+1).map((stop,index,array)=>({...stop,arr:index?stop.arr-origin:null,dep:index===array.length-1?null:(stop.dep==null?null:stop.dep-origin)}));}
  function combine(first,second,dwell=2){const out=first.map(stop=>({...stop})),join=out.at(-1),shift=join.arr+dwell;join.dep=shift;if(second[0].p)join.p=second[0].p;for(const stop of second.slice(1))out.push({...stop,arr:typeof stop.arr==='number'?stop.arr+shift:stop.arr,dep:typeof stop.dep==='number'?stop.dep+shift:stop.dep});return out;}
  const noPass=new Set(['기장','사천','함안','추풍령','불국사','입실','함평','라선','경흥','청진','단천','통천','고성','간성','속초','양양']);
  function enforce(template,allStops,dir){return template.map((stop,index,array)=>{const edge=index===0||index===array.length-1;if(edge)return {...stop,p:stop.p||String(dir==='down'?1:2)};if(!(allStops||noPass.has(stop.s)))return {...stop,p:stop.dep==null?undefined:stop.p};return {...stop,dep:stop.dep==null?stop.arr+1:stop.dep,p:stop.p||String(dir==='down'?1:2)};});}
  function makeStops(template,start){return template.map((entry,index)=>{const last=index===template.length-1,pass=entry.dep==null&&!last,stop={s:entry.s,arr:index?clock(start+entry.arr):null,dep:last||pass?null:clock(start+entry.dep)};if(entry.p&&!pass)stop.p=String(entry.p);return stop;});}
  function add(service){const all=/^ITX/.test(service.grade),down=enforce(service.down,all,'down'),up=enforce(service.up||reverse(service.down),all,'up');service.downDepartures.forEach((start,index)=>{const no=service.first+index*2,upStart=(service.upDepartures||service.downDepartures)[index];ALL_TRAINS.push({no:String(no),dest:service.to,dir:'down',line:service.line,grade:service.grade,boundary:[service.from,service.to],stops:makeStops(down,start)});ALL_TRAINS.push({no:String(no+1),dest:service.from,dir:'up',line:service.line,grade:service.grade,boundary:[service.to,service.from],stops:makeStops(up,upStart)});});}

  const gyeongui=['신의주','용천','염주인광','동림','선천','정주','박천','안주역전','문덕','평원','평양','송림','사리원','서흥','평산','금천','개성','남개성','문산','일산','행신','마포','서울'];
  const wonsanCheong=['원산','안변','고산','세포','평강','철원','연천','전곡','동두천','양주','의정부','청량리'];
  const yanggu=['원산','통천','렴성','고성','서구읍','북현내','해안','양구','춘천','가평','평동초등학교','도농','중랑','청량리'];
  const pyongyangWonsan=['평양','평원','숙천','순천비행장','성천','신양','양덕','원산'];
  const haeju=['평양','강선','강서','남포','은율','송화','장연','태탄','벽성','해주','청단','연안읍','금곡리','개성'];
  const saemmul=['샘물동','강계','성간','전천','희천','향산','순천비행장','은산','평양'];
  const hyesan=['혜산','북단천','단천','리원','북청','신포','운포','삼호','락원','함흥','함주','정평','금야','고원','천내','원산'];
  const musan=['무산','청진','경성','어랑','명간','명천','길주','김책','단천','리원','북청','신포','운포','삼호','락원','함흥','함주','정평','금야','고원','천내','원산'];
  const donghae=['경흥','라선','청진','경성','어랑','명간','명천','길주','김책','단천','리원','북청','신포','운포','삼호','락원','함흥','함주','정평','금야','고원','천내','원산'];
  const ryongyon=['평양','강선','강서','남포','은율','송화','장연','룡연'];
  const wonsanBusan=['원산','통천','고성','서구읍','북현내','간성','속초','양양','주문','강릉','동강릉','옥계','동해','북평','삼척','근덕','원덕','부구','울진','평해','영해','영덕','강구','청하','포항','안강','경주','불국사','입실','북울산','태화강','울주','좌천','기장','송정(부산)','해운대','부산'];
  const southDonghae=['통천','고성','서구읍','북현내','간성','속초','양양','주문','강릉','동강릉','옥계','동해','북평','삼척','근덕','원덕','부구','울진','평해','영해','영덕','강구','청하','포항'];
  const gyeongheungNamdaegu=[...donghae,...southDonghae,'안강','건천','경산','남대구'];
  const gyeongheungMokpo=[...donghae,'안변','고산','세포','평강','철원','연천','동두천','양주','의정부','청량리','한강로','병목안','수영','천안','정안','공주','전주','정읍','광주','나산','함평','무안','도림','목포'];
  const vlad=['서울','청량리','의정부','원산','함흥','청진','라선','모리온','블라디보스토크'];
  const nyongwon=fit('평양-녕원 KTX','녕원','평양',['녕원','강안동','북창','은산','평양']);
  const sinuijuSeoul=fit('서울-신의주 KTX','신의주','서울',gyeongui),seoulSinuiju=fit('서울-신의주 KTX','서울','신의주',gyeongui.toReversed());
  const pIndex=gyeongui.indexOf('평양'),pyongyangSeoul=sinuijuSeoul.slice(pIndex).map((s,i,a)=>({...s,arr:i? s.arr-sinuijuSeoul[pIndex].arr:null,dep:i===a.length-1||s.dep==null?null:s.dep-sinuijuSeoul[pIndex].arr}));
  const seoulPyongyang=seoulSinuiju.slice(0,seoulSinuiju.findIndex(s=>s.s==='평양')+1);
  const localSouth=fit('한강로-부산 ITX새마을','한강로','부산',['한강로','남안양','수원','오산','평택','천안','목천','병천','북청주','서청주','상당','문의','신탄진','회덕','대전','판암','세천','옥천','이원','심천','영동','황간','추풍령','봉산','김천','구미','약목','서왜관','하빈','호림','남대구','경산','운문','언양','동양산','북부산','동래','부산']);
  const seoulLocal=[{s:'서울',arr:null,dep:0,p:'7'},...localSouth.map(s=>({...s,arr:s.arr==null?4:s.arr+4,dep:s.dep==null?null:s.dep+4}))];
  const anjuWonsan=[{s:'안주역전',arr:null,dep:0,p:'2'},{s:'숙천',arr:11,dep:12,p:'2'},{s:'온산',arr:24,dep:25,p:'2'},{s:'원산',arr:108,dep:null,p:'4'}];
  const services=[
    {first:5001,from:'원산',to:'청량리',line:'경원선',grade:'ITX-새마을',down:fit('원산-마포 ITX-마음','원산','청량리',wonsanCheong),downDepartures:departures(325,85,13)},
    {first:5031,from:'원산',to:'청량리',line:'경원선',grade:'ITX-새마을',down:fit('서울-양구-원산 무궁화호','원산','청량리',yanggu),downDepartures:departures(310,75,14)},
    {first:5061,from:'신의주',to:'서울',line:'경의선',grade:'ITX-새마을',down:sinuijuSeoul,up:seoulSinuiju,downDepartures:departures(365,120,9)},
    {first:5081,from:'신의주',to:'부산',line:'경의선·경부선',grade:'ITX-새마을',down:combine(sinuijuSeoul,seoulLocal,5),downDepartures:[330,1215]},
    {first:5101,from:'평양',to:'원산',line:'평원선·순천선',grade:'ITX-새마을',down:fit('평양-원산 무궁화호','평양','원산',pyongyangWonsan),downDepartures:departures(325,90,12)},
    {first:5131,from:'평양',to:'서울',line:'평성선·경의선',grade:'ITX-새마을',down:combine(fit('평양-개성 (해주 경유) KTX','평양','개성',haeju),section(pyongyangSeoul,'개성','서울'),2),downDepartures:departures(305,77,14)},
    {first:5161,from:'샘물동',to:'평양',line:'만포선·평원선',grade:'ITX-마음',down:fit('평양-만포 KTX','만포','평양',saemmul),downDepartures:departures(335,165,7)},
    {first:5181,from:'녕원',to:'평양',line:'녕원선',grade:'ITX-마음',down:nyongwon,downDepartures:departures(320,110,10)},
    {first:5201,from:'혜산',to:'원산',line:'혜산지선·동해선',grade:'ITX-마음',down:fit('원산-혜산 ITX-마음','혜산','원산',hyesan),downDepartures:departures(320,157,7)},
    {first:5221,from:'무산',to:'원산',line:'무산지선·동해선',grade:'ITX-마음',down:fit('원산-무산 ITX-마음','무산','원산',musan),downDepartures:departures(305,147,7)},
    {first:5241,from:'경흥',to:'원산',line:'동해선',grade:'ITX-마음',down:fit('원산-경흥 ITX-마음','경흥','원산',donghae),downDepartures:[330,434,538,642,746,850,954,1058,1157]},
    {first:5261,from:'평양',to:'룡연',line:'평성선·룡연지선',grade:'ITX-마음',down:fit('평양-룡연 KTX','평양','룡연',ryongyon),downDepartures:[345,425,585,665,825,905,1065,1145,1305]},
    {first:5281,from:'녕원',to:'서울',line:'녕원선·경의선',grade:'ITX-마음',down:combine(nyongwon,pyongyangSeoul),downDepartures:[375,595,815,1035,1255]},
    {first:5301,from:'신의주',to:'원산',line:'경의선·평원선·순천선',grade:'ITX-새마을',down:combine(sinuijuSeoul.slice(0,sinuijuSeoul.findIndex(s=>s.s==='안주역전')+1),anjuWonsan),downDepartures:departures(320,180,6)},
    {first:5351,from:'샘물동',to:'서울',line:'만포선·평원선·경의선',grade:'ITX-새마을',down:combine(fit('평양-만포 KTX','만포','평양',saemmul),pyongyangSeoul),downDepartures:[415,580,745,910,1075,1240]},
    {first:8001,from:'서울',to:'블라디보스토크',line:'경원선·동해선',grade:'KTX-산천',down:fit('서울-블라디보스토크 KTX','서울','블라디보스토크',vlad),downDepartures:[310,490,670,850,1030,1320]},
    {first:8021,from:'신의주',to:'부산',line:'경의선·경부고속선',grade:'KTX-산천',down:fit('신의주-부산 KTX','신의주','부산',['신의주','용천','염주인광','동림','정주','박천','안주역전','평양','사리원','평산','개성','서울','대전','구미','김천','남대구','부산']),downDepartures:[310,460,610,760,910,1060,1210,1340]},
    {first:9001,from:'신의주',to:'서울',line:'경의선',grade:'KTX-산천',down:sinuijuSeoul,up:seoulSinuiju,downDepartures:departures(305,120,9)},
    {first:9521,from:'원산',to:'부산',line:'동해선',grade:'KTX-이음',down:fit('원산-부산 KTX','원산','부산',wonsanBusan),downDepartures:departures(310,108,10)},
    {first:9701,from:'경흥',to:'남대구',line:'동해선·대구선',grade:'KTX-산천',down:fit('남대구-경흥 KTX','경흥','남대구',gyeongheungNamdaegu),downDepartures:[310,440,570,700,830,960,1090,1235]},
    {first:9751,from:'경흥',to:'목포',line:'동해선·경원선·경부고속선·호남고속선',grade:'KTX-산천',down:fit('목포-경흥 KTX','경흥','목포',gyeongheungMokpo),downDepartures:[370,520,670,820,970,1120,1270]}
  ];
  for(let i=ALL_TRAINS.length-1;i>=0;i--)if(old(Number(ALL_TRAINS[i].no)))ALL_TRAINS.splice(i,1);
  for(const service of services)add(service);
  const shiftTrain=(train,shift)=>{if(!shift)return;for(const stop of train.stops)for(const key of ['arr','dep'])if(/^\d{1,2}:\d{2}$/.test(stop[key]||'')){const [h,m]=stop[key].split(':').map(Number);stop[key]=clock(h*60+m+shift);}};
  // 사진·인게임 원본 시각을 기준으로 전 구간을 평행 이동한 충돌 해소값이다.
  // 방향별 승강장 분리 후 전 편의 중복 점유와 금지 구간 추월을 함께 검증했다.
  // #9754는 기존편 연속 충돌 해소를 위해 +12분, 나머지는 모두 ±10분 이내다.
  const safetyShifts={5001:-4,5002:-2,5004:-7,5005:-7,5012:7,5013:4,5015:-1,5016:1,5019:8,5022:5,5023:2,5041:1,5053:-1,5061:-1,5065:-1,5069:-1,5070:2,5073:-1,5084:-1,5112:1,5139:2,5141:-1,5151:-1,5158:1,5172:-1,5207:-1,5209:-7,5210:-5,5213:3,5214:-1,5223:-6,5224:5,5226:-4,5230:1,5231:-5,5242:8,5243:1,5245:5,5248:-4,5249:1,5250:2,5252:7,5253:10,5254:-6,5255:-1,5257:-6,5274:-1,5277:-2,5305:-1,5360:-2,5361:-1,8001:1,8002:-1,8007:-1,8008:-1,8009:1,8036:-1,9002:1,9004:-1,9017:-2,9532:-1,9535:-1,9538:1,9702:-7,9703:-6,9704:2,9708:3,9710:-8,9711:3,9712:4,9715:-7,9751:1,9754:12,9759:-8,9760:10,9761:-1,9762:5,9764:6};
  for(const [no,shift] of Object.entries(safetyShifts))shiftTrain(ALL_TRAINS.find(train=>train.no===no),shift);
  globalThis.NIMBI_NORTH_FORMAL_RANGES=services.map(service=>({first:service.first,last:service.first+service.downDepartures.length*2-1,from:service.from,to:service.to,line:service.line,grade:service.grade,count:service.downDepartures.length}));
})();
