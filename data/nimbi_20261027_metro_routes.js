// 누락 역 때문에 시간표·노선도·위치 배열이 서로 어긋난 세 노선을 재정렬한다.
(() => {
  if (typeof METRO_LINES === 'undefined' || typeof METRO_GEO === 'undefined') return;
  const lineByName=name=>METRO_LINES.find(line=>line.name===name);
  const location=name=>{
    const station=typeof STATION_DB==='undefined'?null:STATION_DB[`${name}역`];
    return station?[station.lon,station.lat]:null;
  };
  const distance=(a,b)=>{
    const A=location(a),B=location(b);
    return A&&B?Math.hypot((B[0]-A[0])*88,(B[1]-A[1])*111):null;
  };
  const align=(name,missing)=>{
    const line=lineByName(name),geo=METRO_GEO[name];
    if(!line||!geo?.m)return;
    const route=line.routes?.[0];
    if(route?.xy?.length===line.stations.length){
      for(const station of missing){
        const index=line.stations.indexOf(station);
        if(index<=0||index>=line.stations.length-1)continue;
        const before=line.stations[index-1],after=line.stations[index+1];
        const da=distance(before,station),db=distance(station,after);
        if(da==null||db==null||da+db===0)continue;
        const pointA=route.xy[index-1],pointB=route.xy[index+1];
        if(!pointA||!pointB)continue;
        const ratio=da/(da+db);
        route.xy[index]=[pointA[0]+(pointB[0]-pointA[0])*ratio,pointA[1]+(pointB[1]-pointA[1])*ratio];
      }
    }
    const original=line.stations.filter(station=>!missing.includes(station));
    if(geo.m.length===original.length){
      const old=new Map(original.map((station,index)=>[station,geo.m[index]]));
      geo.m=line.stations.map(station=>old.get(station)||location(station));
    }
    const track=typeof METRO_TRACK==='undefined'?null:METRO_TRACK[name];
    if(track?.ss?.length!==original.length)return;
    const oldS=new Map(original.map((station,index)=>[station,track.ss[index]]));
    track.ss=line.stations.map((station,index)=>{
      if(oldS.has(station))return oldS.get(station);
      const before=line.stations[index-1],after=line.stations[index+1];
      const a=oldS.get(before),b=oldS.get(after);
      const da=distance(before,station),db=distance(station,after);
      return a!=null&&b!=null&&da!=null&&db!=null&&da+db>0
        ?Math.round(a+(b-a)*da/(da+db)):(a+b)/2;
    });
  };
  align('교하선',['덕양','내곡']);
  align('서산선',['성내','내곡']);

  // 광주1호선의 일곡은 예향 다음 역이다. 원래 본선 위 광주-공항 사이에
  // 삽입하면 노선도가 역순으로 꺾이므로 예향-일곡-광주 연결을 별도 경로로 둔다.
  const line=lineByName('광주1호선'),geo=METRO_GEO['광주1호선'];
  if(line&&geo?.m){
    const main=['평동','광주','공항','광주시청','유스퀘어','임동','광주중앙','전남대','오치','예향'];
    const route=line.routes?.[0];
    const original=new Map((route?.stations||[]).map((station,index)=>[station,route.xy[index]]));
    const originalGeo=new Map(main.map((station,index)=>[station,geo.m[index]]));
    const ilGok=location('일곡');
    if(route&&ilGok){
      route.stations=[...main];
      route.xy=main.map(station=>original.get(station));
      const ilGokXY=[180.7,809.8];
      line.routes=[route,{stations:['예향','일곡','광주'],xy:[route.xy.at(-1),ilGokXY,route.xy[1]]}];
      line.stations=[...main,'일곡'];
      line.from='평동';
      line.to='평동';
      line.loop=true;
      geo.m=[...main.map(station=>originalGeo.get(station)),ilGok];
    }
  }
})();
