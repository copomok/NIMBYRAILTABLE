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
  function fit(lineName,from,to,names,{photo=false}={}){
    const raw=rawSegment(lineName,from,to),start=photo?raw[0].departure:raw[0].arrival,anchors=[];
    const quantize=photo?Math.floor:Math.round;
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
      if(exact){arr=quantize((exact.row.arrival-start)/60);dep=photo&&exact.row.departure===exact.row.arrival?null:quantize((exact.row.departure-start)/60);p=exact.row.platform||undefined;}
      else{const left=anchors.filter(anchor=>anchor.nameIndex<index).at(-1),right=anchors.find(anchor=>anchor.nameIndex>index);const a=(left.row.departure-start)/60,b=(right.row.arrival-start)/60;arr=quantize(a+(b-a)*(index-left.nameIndex)/(right.nameIndex-left.nameIndex));dep=null;}
      return {s:canon(name),arr:index===0?null:arr,dep:index===names.length-1?null:dep,p};
    }).map((stop,index)=>index===0?{...stop,dep:0}:stop);
  }
  const fitPhoto=(lineName,from,to,names)=>fit(lineName,from,to,names,{photo:true});
  // 제공된 인게임 사진에서 직접 판독한 정차 승강장이다.
  // 방위 문자(N/S/E/W)는 버리고 숫자만 보존하며, 사진에 없는 통과역에는 적용하지 않는다.
  function applyPhotoPlatforms(template,platforms){return template.map(stop=>platforms[stop.s]==null?stop:{...stop,p:String(platforms[stop.s])});}
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
  function enforce(template,allStops,dir,preservePhotoPasses=false){return template.map((stop,index,array)=>{const edge=index===0||index===array.length-1;if(edge)return {...stop,p:stop.p||String(dir==='down'?1:2)};if(preservePhotoPasses&&stop.dep==null)return {...stop,p:undefined};if(!(allStops||noPass.has(stop.s)))return {...stop,p:stop.dep==null?undefined:stop.p};return {...stop,dep:stop.dep==null?stop.arr+1:stop.dep,p:stop.p||String(dir==='down'?1:2)};});}
  function makeStops(template,start){return template.map((entry,index)=>{const last=index===template.length-1,pass=entry.dep==null&&!last,stop={s:entry.s,arr:index?(entry.arr==='통과'?'통과':clock(start+entry.arr)):null,dep:last||pass?null:clock(start+entry.dep)};if(entry.p&&!pass)stop.p=String(entry.p);if(entry.geoKey)stop.geoKey=entry.geoKey;return stop;});}
  function add(service){const all=/^ITX/.test(service.grade),down=enforce(service.down,all,'down',service.preservePhotoPasses),up=enforce(service.up||reverse(service.down),all,'up',service.preservePhotoPasses);service.downDepartures.forEach((start,index)=>{const no=service.first+index*2,upStart=(service.upDepartures||service.downDepartures)[index];ALL_TRAINS.push({no:String(no),dest:service.to,dir:'down',line:service.line,grade:service.grade,boundary:[service.from,service.to],stops:makeStops(down,start)});ALL_TRAINS.push({no:String(no+1),dest:service.from,dir:'up',line:service.line,grade:service.grade,boundary:[service.to,service.from],stops:makeStops(up,upStart)});});}

  const gyeongui=['신의주','용천','염주인광','동림','선천','정주','박천','안주역전','문덕','평원','평양','송림','사리원','서흥','평산','금천','개성','남개성','문산','일산','행신','마포','서울'];
  const wonsanCheong=['원산','안변','고산','세포','평강','철원','연천','전곡','동두천','양주','의정부','청량리'];
  const yanggu=['원산','통천','렴성','고성','서구읍','북현내','해안','양구','춘천','가평','호평','도농','중랑','청량리'];
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
  const photoPlatforms={
    wonsanBusan:{'원산':1,'통천':1,'고성':3,'간성':1,'속초':1,'양양':1,'주문':1,'강릉':32,'동강릉':2,'동해':2,'울진':1,'영해':2,'영덕':1,'강구':2,'청하':2,'포항':5,'경주':3,'북울산':2,'태화강':5,'울주':5,'좌천':4,'기장':3,'부산':13},
    wonsanHyesan:{'원산':4,'천내':2,'고원':2,'금야':2,'정평':2,'함흥':6,'락원':1,'삼호':2,'운포':1,'신포':1,'북청':1,'리원':1,'단천':2,'북단천':2,'혜산':1},
    wonsanMusan:{'원산':4,'천내':2,'고원':2,'금야':2,'정평':2,'함주':1,'함흥':6,'락원':1,'삼호':2,'운포':1,'신포':1,'북청':1,'리원':1,'단천':2,'김책':4,'길주':1,'명천':1,'명간':1,'어랑':2,'경성':4,'청진':1,'무산':1},
    mokpoGyeongheung:{'목포':1,'도림':3,'무안':5,'함평':4,'광주':16,'정읍':4,'전주':4,'공주':3,'천안':6,'수영':6,'한강로':4,'청량리':25,'의정부':2,'양주':2,'동두천':2,'연천':4,'철원':3,'평강':2,'세포':3,'고산':3,'안변':3,'원산':6,'함흥':8,'북청':2,'단천':2,'김책':2,'명간':2,'경성':3,'청진':1,'라선':1,'경흥':2}
  };
  const photoWonsanBusan=applyPhotoPlatforms(fitPhoto('원산-부산 KTX','원산','부산',wonsanBusan),photoPlatforms.wonsanBusan);
  const photoBusanWonsan=fitPhoto('원산-부산 KTX','부산','원산',wonsanBusan.toReversed());
  const hyesanWonsan=fitPhoto('원산-혜산 ITX-마음','혜산','원산',hyesan);
  const musanWonsan=fitPhoto('원산-무산 ITX-마음','무산','원산',musan);
  const gyeongheungMokpoTemplate=fitPhoto('목포-경흥 KTX','경흥','목포',gyeongheungMokpo);
  const photoWonsanHyesan=applyPhotoPlatforms(fitPhoto('원산-혜산 ITX-마음','원산','혜산',hyesan.toReversed()),photoPlatforms.wonsanHyesan);
  const photoWonsanMusan=applyPhotoPlatforms(fitPhoto('원산-무산 ITX-마음','원산','무산',musan.toReversed()),photoPlatforms.wonsanMusan);
  const photoMokpoGyeongheung=applyPhotoPlatforms(fitPhoto('목포-경흥 KTX','목포','경흥',gyeongheungMokpo.toReversed()),photoPlatforms.mokpoGyeongheung);
  const sinuijuSeoul=fit('서울-신의주 KTX','신의주','서울',gyeongui),seoulSinuiju=fit('서울-신의주 KTX','서울','신의주',gyeongui.toReversed());
  // 2026-10-27 새 ITX-새마을 사진. 각 역의 시·분은 사진의 초를 먼저 버린 값이다.
  // 신설 녕원선 역 좌표는 같은 날 제공된 인게임 GeoJSON에서 별도로 반영한다.
  const photoMinute=(value,origin='05:00')=>{const [hour,minute]=value.split(':').map(Number),[startHour,startMinute]=origin.split(':').map(Number);return hour*60+minute-startHour*60-startMinute;};
  const photoStops=(rows,origin='05:00')=>rows.map(([s,arrival,departure,p,geoKey],index)=>{
    if(arrival==='통과')return {s,arr:'통과',dep:null};
    const pass=departure==null&&index<rows.length-1;
    const stop={s,arr:index?photoMinute(arrival,origin):null,dep:index===rows.length-1||pass?null:photoMinute(departure,origin)};
    if(p!=null&&!pass)stop.p=String(p);
    if(geoKey)stop.geoKey=geoKey;
    return stop;
  });
  const saemaeulSeoulSinuiju=photoStops([
    ['서울',null,'05:00',10],['마포','05:03','05:04',6],['행신','05:08',null],['일산','05:13','05:14',3],
    ['문산','05:23','05:24',4],['도라산','05:28','05:29',2],['판문','05:32','05:33',2],
    ['개성공단','05:35','05:36',2],['개성','05:40','05:41',4],['금천','05:52','05:53',2],
    ['평산','06:03','06:03',2],['서흥','06:12','06:12',2],['사리원','06:31','06:32',6],
    ['송림','06:46','06:47',1],['평양','07:02','07:03',8],['서평양','07:06','07:07',4],
    ['서포','07:09','07:10',2],['순안','07:17','07:18',2],['평원','07:25','07:26',2],
    ['금풍','07:30','07:31',2],['문덕','07:39','07:40',4],['안주역전','07:45','07:46',4],
    ['운전','07:52','07:53',2],['운하','07:58','07:59',2],['정주','08:09','08:10',4],
    ['곽산','08:16','08:17',2],['선천','08:26','08:27',2],['동림','08:36','08:37',2],
    ['염주','08:42','08:43',2],['룡천','08:51','08:52',2],['신의주','08:59',null,5]
  ]);
  const saemaeulSinuijuSeoul=photoStops([
    ['신의주',null,'05:00',5],['룡천','05:06','05:07',1],['염주','05:15','05:16',1],
    ['동림','05:21','05:22',1],['선천','05:31','05:32',1],['곽산','05:41','05:42',1],
    ['정주','05:48','05:49',1],['운하','05:59','06:00',1],['운전','06:05','06:06',1],
    ['안주역전','06:12','06:13',3],['문덕','06:18','06:19',1],['금풍','06:27','06:28',1],
    ['평원','06:32','06:33',1],['순안','06:40','06:41',1],['서포','06:48','06:49',1],
    ['서평양','06:51','06:52',1],['평양','06:55','06:56',7],['송림','07:11','07:12',4],
    ['사리원','07:26','07:27',5],['서흥','07:45','07:46',1],['평산','07:55','07:55',1],
    ['금천','08:05','08:06',1],['개성','08:17','08:18',1],['개성공단','08:21','08:22',1],
    ['판문','08:25','08:26',1],['도라산','08:29','08:30',1],['문산','08:34','08:35',3],
    // 서울 최종 행은 사진 밖이다. 마포→서울의 반대 방향 운전시분과 승강장 사용 패턴으로 역산했다.
    ['일산','08:44','08:45',3],['행신','08:50',null],['마포','08:53','08:54',5],['서울','08:58',null,9]
  ]);
  // 2026-10-27 신의주–부산 KTX 사진: 한 편성의 신의주→부산→신의주 왕복 기록.
  // 사진의 초는 각 절대 시각에서 버리고, 0초 정차는 시각 있는 통과로 보존한다.
  // 상행 마지막 신의주 행만 사진 아래에서 잘려 하행 동림→신의주 운전시분으로 역산했다.
  const gyeonguiNew=['서울','마포','행신','일산','문산','도라산','판문','개성공단','개성','금천','평산','서흥','사리원','송림','평양','서평양','서포','순안','평원','금풍','문덕','안주역전','운전','운하','정주','곽산','선천','동림','염주','룡천','신의주'];
  const ktxFullRoute=[...gyeonguiNew.toReversed(),'수영','천안','대전','남대구','부산'];
  const addUntimedPasses=(rows,route)=>{
    const byName=new Map(rows.map(row=>[row[0],row]));
    if(rows.length!==byName.size||rows.some((row,index)=>route.indexOf(row[0])<0||(index&&route.indexOf(row[0])<=route.indexOf(rows[index-1][0]))))throw new Error('사진 역순과 경의선 경로 불일치');
    return route.map(name=>byName.get(name)||[name,'통과',null]);
  };
  const ktxSinuijuBusan=photoStops(addUntimedPasses([
    ['신의주','08:58','09:00',3],['동림','09:06',null],['정주','09:23','09:25',2],
    ['안주역전','09:39',null],['평양','09:59','10:01',5],['사리원','10:19','10:22',3],
    ['개성','10:46','10:48',2],['문산','10:56',null],['일산','11:03',null],
    ['서울','11:13','11:15',7],['수영','11:26',null],['천안','11:38',null],
    ['대전','11:56','11:58',3],['남대구','12:29','12:31',1],['부산','12:57',null,14]
  ],ktxFullRoute),'09:00');
  const ktxBusanSinuiju=photoStops(addUntimedPasses([
    ['부산','12:57','13:00',14],['남대구','13:25','13:27',2],['대전','13:58','14:01',4],
    ['천안','14:19',null],['수영','14:31',null],['서울','14:41','14:44',8],
    ['일산','14:54',null],['문산','15:01',null],['개성','15:09','15:11',5],
    ['사리원','15:35','15:38',4],['평양','15:56','15:58',6],['안주역전','16:19',null],
    ['정주','16:33','16:35',3],['동림','16:54',null],['신의주','17:00',null,4]
  ],ktxFullRoute.toReversed()),'13:00');
  // 녕원–서울 새마을 사진 1~25번: 녕원선의 신설 역과 경의선 직통 구간.
  // 서울에서 되돌아오는 26~48번 행도 양방향 승강장과 운전시분을 각각 보존한다.
  const nyongwonSeoulRows=[
    ['녕원','05:59','06:00',2],['덕천','06:09','06:09',2],['남덕','06:14','06:15',1],
    ['송림','06:18','06:18',1,'송림(녕원선)'],['북창','06:21','06:21',1],['구봉','06:29','06:29',2],
    ['은산','06:38','06:38',1],['평성','06:48','06:48',5],['배산점','06:50','06:51',1],
    ['서포','06:59','06:59',1],['서평양','07:02','07:02',1],['평양','07:05','07:06',7],
    ['송림','07:21','07:21',4],['사리원','07:34','07:35',5],['서흥','07:54','07:54',1],
    ['평산','08:02','08:02',1],['금천','08:12','08:12',1],['개성','08:22','08:23',1],
    ['개성공단','08:27','08:27',1],['판문','08:29','08:29',1],['도라산','08:33','08:33',1],
    ['문산','08:37','08:37',3],['일산','08:47','08:47',2],['행신','08:52','08:52',1],
    ['서울','08:59',null,9]
  ];
  const seoulNyongwonRows=[
    ['서울','08:59','08:59',9],['행신','09:07','09:07',2],['일산','09:12','09:12',3],
    ['문산','09:22','09:22',4],['도라산','09:26','09:26',2],['판문','09:29','09:30',2],
    ['개성공단','09:32','09:32',2],['개성','09:36','09:36',4],['금천','09:47','09:47',2],
    ['평산','09:57','09:57',2],['서흥','10:05','10:05',2],['사리원','10:24','10:24',6],
    ['송림','10:38','10:38',1],['평양','10:53','10:53',8],['서평양','10:57','10:57',4],
    ['서포','10:59','11:00',2],['배산점','11:08','11:08',2],['평성','11:10','11:11',6],
    ['은산','11:24','11:24',2],['구봉','11:30','11:30',1],['북창','11:38','11:38',2],
    ['송림','11:41','11:41',2,'송림(녕원선)'],['남덕','11:44','11:44',2],['덕천','11:49','11:50',1],
    // 마지막 행은 사진 밖: 하행의 녕원–덕천 운전시분을 역산한다.
    ['녕원','11:58',null,1]
  ];
  const nyongwonSeoulPhoto=photoStops(nyongwonSeoulRows,'06:00');
  const seoulNyongwonPhoto=photoStops(seoulNyongwonRows,'08:59');
  const nyongwonPyongyangPhoto=photoStops(nyongwonSeoulRows.slice(0,12).map((row,index)=>index===11?[row[0],row[1],null,row[3]]:row),'06:00');
  const pyongyangNyongwonPhoto=photoStops(seoulNyongwonRows.slice(13).map((row,index)=>index===0?[row[0],row[1],row[2],row[3]]:row),'10:53');
  const pIndex=gyeongui.indexOf('평양'),pyongyangSeoul=sinuijuSeoul.slice(pIndex).map((s,i,a)=>({...s,arr:i? s.arr-sinuijuSeoul[pIndex].arr:null,dep:i===a.length-1||s.dep==null?null:s.dep-sinuijuSeoul[pIndex].arr}));
  const seoulPyongyang=seoulSinuiju.slice(0,seoulSinuiju.findIndex(s=>s.s==='평양')+1);
  const localSouth=fit('한강로-부산 ITX새마을','한강로','부산',['한강로','남안양','수원','오산','평택','천안','목천','병천','북청주','서청주','상당','문의','신탄진','회덕','대전','판암','세천','옥천','이원','심천','영동','황간','추풍령','봉산','김천','구미','약목','서왜관','하빈','호림','남대구','경산','운문','언양','동양산','북부산','동래','부산']);
  const seoulLocal=[{s:'서울',arr:null,dep:0,p:'7'},...localSouth.map(s=>({...s,arr:s.arr==null?4:s.arr+4,dep:s.dep==null?null:s.dep+4}))];
  const anjuWonsan=[{s:'안주역전',arr:null,dep:0,p:'2'},{s:'숙천',arr:11,dep:12,p:'2'},{s:'온산',arr:24,dep:25,p:'2'},{s:'원산',arr:108,dep:null,p:'4'}];
  const services=[
    {first:5001,from:'원산',to:'청량리',line:'경원선',grade:'ITX-새마을',down:fit('원산-마포 ITX-마음','원산','청량리',wonsanCheong),downDepartures:departures(325,85,13)},
    {first:5031,from:'원산',to:'청량리',line:'경원선',grade:'ITX-새마을',down:fit('서울-양구-원산 무궁화호','원산','청량리',yanggu),downDepartures:departures(310,75,14)},
    {first:5061,from:'신의주',to:'서울',line:'경의선',grade:'ITX-새마을',down:saemaeulSinuijuSeoul,up:saemaeulSeoulSinuiju,preservePhotoPasses:true,downDepartures:departures(300,65,15)},
    {first:5091,from:'신의주',to:'부산',line:'경의선·경부선',grade:'ITX-새마을',down:combine(sinuijuSeoul,seoulLocal,5),downDepartures:[330,1215]},
    {first:5101,from:'평양',to:'원산',line:'평원선·순천선',grade:'ITX-새마을',down:fit('평양-원산 무궁화호','평양','원산',pyongyangWonsan),downDepartures:departures(325,90,12)},
    {first:5131,from:'평양',to:'서울',line:'평성선·경의선',grade:'ITX-새마을',down:combine(fit('평양-개성 (해주 경유) KTX','평양','개성',haeju),section(pyongyangSeoul,'개성','서울'),2),downDepartures:departures(305,77,14)},
    {first:5161,from:'샘물동',to:'평양',line:'만포선·평원선',grade:'ITX-마음',down:fit('평양-만포 KTX','만포','평양',saemmul),downDepartures:departures(335,165,7)},
    {first:5181,from:'녕원',to:'평양',line:'녕원선',grade:'ITX-새마을',down:nyongwonPyongyangPhoto,up:pyongyangNyongwonPhoto,preservePhotoPasses:true,downDepartures:[365,430,560,625,755,820,950,1015,1145,1215]},
    {first:5201,from:'혜산',to:'원산',line:'동해선',grade:'ITX-마음',down:hyesanWonsan,up:photoWonsanHyesan,preservePhotoPasses:true,downDepartures:departures(320,157,7)},
    {first:5221,from:'무산',to:'원산',line:'동해선',grade:'ITX-마음',down:musanWonsan,up:photoWonsanMusan,preservePhotoPasses:true,downDepartures:departures(305,147,7)},
    {first:5241,from:'경흥',to:'원산',line:'동해선',grade:'ITX-마음',down:fit('원산-경흥 ITX-마음','경흥','원산',donghae),downDepartures:[330,434,538,642,746,850,954,1058,1157]},
    {first:5261,from:'평양',to:'룡연',line:'평성선',grade:'ITX-마음',down:fit('평양-룡연 KTX','평양','룡연',ryongyon),downDepartures:[345,425,585,665,825,905,1065,1145,1305]},
    // 서울 계통 1왕복을 증편해야 양 끝에서 출발한 모든 편성이 당일 원 기점으로 복귀한다.
    {first:5281,from:'녕원',to:'서울',line:'녕원선·경의선',grade:'ITX-새마을',down:nyongwonSeoulPhoto,up:seoulNyongwonPhoto,preservePhotoPasses:true,downDepartures:[300,495,690,885,1080,1275]},
    {first:5301,from:'신의주',to:'원산',line:'경의선·평원선·순천선',grade:'ITX-새마을',down:combine(sinuijuSeoul.slice(0,sinuijuSeoul.findIndex(s=>s.s==='안주역전')+1),anjuWonsan),downDepartures:departures(320,180,6)},
    {first:5351,from:'샘물동',to:'서울',line:'만포선·평원선·경의선',grade:'ITX-새마을',down:combine(fit('평양-만포 KTX','만포','평양',saemmul),pyongyangSeoul),downDepartures:[415,580,745,910,1075,1240]},
    {first:8001,from:'서울',to:'블라디보스토크',line:'경원선·동해선',grade:'KTX-산천',down:fit('서울-블라디보스토크 KTX','서울','블라디보스토크',vlad),downDepartures:[310,490,670,850,1030,1320]},
    {first:8021,from:'신의주',to:'부산',line:'경의선·경부고속선',grade:'KTX-산천',down:ktxSinuijuBusan,up:ktxBusanSinuiju,preservePhotoPasses:true,downDepartures:[310,435,560,685,810,935,1060,1185]},
    {first:9001,from:'신의주',to:'서울',line:'경의선',grade:'KTX-산천',down:sinuijuSeoul,up:seoulSinuiju,downDepartures:departures(305,120,9)},
    {first:9521,from:'원산',to:'부산',line:'동해선',grade:'KTX-이음',down:photoWonsanBusan,up:photoBusanWonsan,preservePhotoPasses:true,downDepartures:departures(310,108,10)},
    {first:9701,from:'경흥',to:'남대구',line:'동해선·대구선',grade:'KTX-산천',down:fit('남대구-경흥 KTX','경흥','남대구',gyeongheungNamdaegu),downDepartures:[310,440,570,700,830,960,1090,1235]},
    {first:9751,from:'경흥',to:'목포',line:'동해선·경원선·경부고속선·호남고속선',grade:'KTX-산천',down:gyeongheungMokpoTemplate,up:photoMokpoGyeongheung,preservePhotoPasses:true,downDepartures:[370,520,670,820,970,1120,1270]}
  ];
  for(let i=ALL_TRAINS.length-1;i>=0;i--)if(old(Number(ALL_TRAINS[i].no)))ALL_TRAINS.splice(i,1);
  for(const service of services)add(service);
  const shiftTrain=(train,shift)=>{if(!shift)return;for(const stop of train.stops)for(const key of ['arr','dep'])if(/^\d{1,2}:\d{2}$/.test(stop[key]||'')){const [h,m]=stop[key].split(':').map(Number);stop[key]=clock(h*60+m+shift);}};
  // 사진·인게임 원본 시각을 기준으로 전 구간을 평행 이동한 충돌 해소값이다.
  // 방향별 승강장 분리 후 전 편의 중복 점유와 금지 구간 추월을 함께 검증했다.
  // #8031은 수영–천안의 추월 불가 구간을 피하려고 +14분 이동한다.
  const safetyShifts={5001:-4,5002:-2,5004:-7,5005:-8,5012:7,5013:4,5015:-1,5016:1,5019:8,5022:5,5041:1,5053:-1,5067:5,5094:-1,5112:1,5139:2,5141:-1,5151:-1,5158:1,5172:-1,5207:-1,5209:-5,5210:-5,5213:3,5214:-1,5221:1,5223:-6,5224:6,5226:-4,5230:3,5231:-5,5234:1,5242:8,5243:1,5244:-10,5245:5,5247:-2,5248:-6,5249:1,5250:2,5252:7,5253:10,5254:-8,5255:-1,5257:-8,5274:-1,5277:-2,5305:-1,5360:-2,5361:-1,8001:-5,8002:-1,8007:-1,8008:-1,8009:1,8024:5,8026:4,8027:5,8030:4,8031:5,8034:4,8036:-1,9002:1,9004:-1,9017:-2,9532:-1,9533:2,9535:-1,9538:2,9702:-7,9703:-6,9704:2,9708:3,9710:-8,9711:3,9712:4,9715:-9,9751:3,9752:2,9753:2,9754:12,9759:-13,9760:10,9761:-1,9762:7,9764:8};
  safetyShifts[8001]=1; // 기존 블라디보스토크 운용 시각 유지
  safetyShifts[8021]=10; // 수영–천안 비추월 구간에서 선행 열차 뒤 5분 이상 유지
  safetyShifts[8022]=5; // 부산 14번 승강장 #9522와 시각 분리
  safetyShifts[5285]=3; // 평양역 #5165와 7번 승강장 중복 점유 방지
  safetyShifts[5198]=-4; // 은산역 #5172와 3분 이상 분리, 이후 녕원 회차 9분
  safetyShifts[8030]=5; // 부산 14번 승강장 #514와 3분 분리
  safetyShifts[8025]=1;
  safetyShifts[8032]=-1;
  safetyShifts[8031]=14;
  safetyShifts[8036]=12; // #8031 부산 도착 뒤 6분 회차
  safetyShifts[5194]=-1;
  safetyShifts[5290]=1;
  safetyShifts[8034]=9;
  safetyShifts[5023]=2; // 기존 원산 회차 5분 확보값 유지
  safetyShifts[5065]=7; // 마포역 #509·평원역 #5104 모두 3분 이상 분리
  safetyShifts[5070]=5; // 평원역 #5109와 정차 시각 분리
  safetyShifts[5072]=5; // 숙천역 #5110과 정차 시각 분리
  safetyShifts[5073]=-5; // 평원역 #5110과 정차 시각 분리
  safetyShifts[5076]=6; // 마포역 #510·평양역 #5270 모두 3분 이상 분리
  safetyShifts[5078]=1; // #5076 조정 후 60분 배차 유지
  safetyShifts[5079]=5; // 사진 소요시간을 보존하며 마포역 #521과 5분 분리
  safetyShifts[5085]=5; // 숙천역 #5119와 정차 시각 분리
  safetyShifts[5087]=5; // 평원역 #5120과 정차 시각 분리
  for(const [no,shift] of Object.entries(safetyShifts))shiftTrain(ALL_TRAINS.find(train=>train.no===no),shift);
  globalThis.NIMBI_NORTH_FORMAL_RANGES=services.map(service=>({first:service.first,last:service.first+service.downDepartures.length*2-1,from:service.from,to:service.to,line:service.line,grade:service.grade,count:service.downDepartures.length}));
})();
