/* 2026-10-22 통과역 보강. 기존 정차역의 도착·출발 시각은 유지한다. */
(()=>{
  if(typeof ALL_TRAINS==='undefined')return;
  const minute=value=>{
    const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);
    return match?Number(match[1])*60+Number(match[2]):null;
  };
  const clock=value=>`${Math.floor((value%1440+1440)%1440/60)}:${String((value%60+60)%60).padStart(2,'0')}`;
  const elapsed=(start,end)=>(end-start+1440)%1440;
  const addPass=(train,from,to,station,time)=>{
    const index=train.stops.findIndex((stop,i)=>stop.s===from&&train.stops[i+1]?.s===to);
    if(index<0||train.stops.some(stop=>stop.s===station))return;
    train.stops.splice(index+1,0,{s:station,arr:clock(time),dep:null});
  };

  for(const train of ALL_TRAINS){
    const no=Number(train.no);
    if(no>=1981&&no<=1998){
      // 사진 #220014/#220016: 06:00 출발, 남안양 WP 06:10:58,
      // 평택 WP 06:35:54. #1994 상행: 수원 출발 14:27:33,
      // 남안양 WP 14:34:20, 천안 출발 13:59:28, 평택 WP 14:09:11.
      // 사진의 초를 버린 상대 분 단위 운전시분을 전 편에 적용한다.
      if(train.dir==='down'){
        const first=minute(train.stops[0].dep);
        addPass(train,'한강로','수원','남안양',first+10);
        addPass(train,'오산','천안','평택',first+35);
      }else{
        const suwon=train.stops.find(stop=>stop.s==='수원');
        const cheonan=train.stops.find(stop=>stop.s==='천안');
        addPass(train,'수원','한강로','남안양',minute(suwon.dep)+7);
        addPass(train,'천안','오산','평택',minute(cheonan.dep)+10);
      }
    }

    if(no>=621&&no<=632&&train.grade==='KTX-이음'){
      // 인게임 강릉-광주 KTX 원본의 전주→장성 구간:
      // 전주 출발 7811초, 정읍 WP 8493초, 북이 WP 8771초,
      // 장성 도착 9010초. 역방향은 장성 도착 9906초,
      // 북이 WP 10242초, 정읍 WP 10520초, 전주 도착 11196초.
      // 앱의 정차 시각을 양 끝으로 고정해 원본 구간 비율을 적용한다.
      const northi=train.stops.find(stop=>stop.s==='북이');
      const jangseong=train.stops.find(stop=>stop.s==='장성');
      const jeonju=train.stops.find(stop=>stop.s==='전주');
      if(!northi||!jangseong||!jeonju)continue;
      if(train.dir==='down'){
        const start=minute(jeonju.dep),end=minute(jangseong.arr);
        const duration=elapsed(start,end);
        northi.arr=clock(start+Math.floor(duration*960/1199));
        addPass(train,'전주','북이','정읍',start+Math.floor(duration*682/1199));
      }else{
        const start=minute(jangseong.arr),end=minute(jeonju.arr);
        const duration=elapsed(start,end);
        northi.arr=clock(start+Math.floor(duration*336/1290));
        addPass(train,'북이','전주','정읍',start+Math.floor(duration*614/1290));
      }
      // 장성의 기존 도착 시각을 그대로 통과 시각으로 사용한다.
      jangseong.dep=null;
      delete jangseong.p;
    }

    // 남대구-부산 KTX 원본에는 청도 시각이 없다. 동일 구간 SRT
    // 인게임 원본의 위치 비율을 적용해 정차역 시각 사이에서 추산한다.
    if(!/^KTX/.test(train.grade))continue;
    const downIndex=train.stops.findIndex((stop,i)=>stop.s==='남대구'&&
      (train.stops[i+1]?.s==='부산'||
        (train.stops[i+1]?.s==='청도'&&train.stops[i+2]?.s==='부산')));
    const upIndex=train.stops.findIndex((stop,i)=>stop.s==='부산'&&
      (train.stops[i+1]?.s==='남대구'||
        (train.stops[i+1]?.s==='청도'&&train.stops[i+2]?.s==='남대구')));
    const index=downIndex>=0?downIndex:upIndex;
    if(index<0)continue;
    const existing=train.stops[index+1]?.s==='청도'?train.stops[index+1]:null;
    if(existing&&(existing.dep!=null||minute(existing.arr)!=null))continue;
    const first=train.stops[index],last=train.stops[index+(existing?2:1)];
    const start=minute(first.dep),end=minute(last.arr);
    if(start==null||end==null)continue;
    const duration=elapsed(start,end);
    // SRT 하행: 남대구 출발 4842초→청도 도착 5324초→부산 도착 6588초.
    // 상행: 부산 출발 6648초→청도 도착 7873초→남대구 도착 8421초.
    const numerator=downIndex>=0?482:1225,denominator=downIndex>=0?1746:1773;
    const offset=Math.max(1,Math.min(duration-1,Math.floor(duration*numerator/denominator)));
    if(existing)existing.arr=clock(start+offset);
    else train.stops.splice(index+1,0,{s:'청도',arr:clock(start+offset),dep:null});
  }
})();
