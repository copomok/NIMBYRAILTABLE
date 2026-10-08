// 인게임에서 한쪽 동명이역의 이름이 변경된 사항을 최종 표시 데이터에 반영한다.
// 동명이역 분리와 인게임 승강장 추출이 끝난 뒤 실행해야 한다.
(() => {
  const renameArray=(values,before,after)=>Array.isArray(values)
    ?values.map(value=>value===before?after:value):values;
  const renameKey=(object,before,after)=>{
    if(!object||!Object.prototype.hasOwnProperty.call(object,before))return;
    object[after]=object[before];
    delete object[before];
  };
  const renameLineStation=(lineName,before,after)=>{
    if(typeof METRO_LINES!=='undefined'){
      const line=METRO_LINES.find(item=>item.name===lineName);
      if(line){
        line.stations=renameArray(line.stations,before,after);
        for(const route of line.routes||[])route.stations=renameArray(route.stations,before,after);
        if(line.from===before)line.from=after;
        if(line.to===before)line.to=after;
      }
    }
    if(typeof METRO_SCHED!=='undefined'&&METRO_SCHED[lineName]){
      METRO_SCHED[lineName].s=renameArray(METRO_SCHED[lineName].s,before,after);
    }
    const direction=globalThis.METRO_PLATFORM_DIRECTIONS?.lines?.[lineName];
    if(direction){
      direction.route=renameArray(direction.route,before,after);
      renameKey(direction.platforms,before,after);
    }
  };

  // 일곡 동명이 해소됨: 광주1호선은 본래 이름, 광주2호선은 월곡.
  renameLineStation('광주2호선','일곡','월곡');
  renameLineStation('광주1호선','일곡(광주북부)','일곡');
  // 광명성남선의 비산은 안양천으로 변경. 안산안양선의 비산만 대표명을 유지한다.
  renameLineStation('광명성남선','비산(만안)','안양천');
  // 승강장 방향 스냅샷은 동명이역 보정 전의 원명을 유지하므로 별도로 맞춘다.
  const gwangmyeongDirections=globalThis.METRO_PLATFORM_DIRECTIONS?.lines?.['광명성남선'];
  if(gwangmyeongDirections){
    gwangmyeongDirections.route=renameArray(gwangmyeongDirections.route,'비산','안양천');
    renameKey(gwangmyeongDirections.platforms,'비산','안양천');
  }
  // 서로 다른 위치의 서초역 중 강서선 역은 대법원으로 개명한다.
  renameLineStation('강서선','서초','대법원');

  if(typeof STATION_DB!=='undefined'){
    renameKey(STATION_DB,'일곡역','월곡역');
    renameKey(STATION_DB,'일곡(광주북부)역','일곡역');
    renameKey(STATION_DB,'비산(만안)역','안양천역');
    // station update 원본에서 같은 키로 합쳐졌던 두 역을 실제 인게임 좌표로 다시 분리한다.
    STATION_DB['서초역']={lon:127.024472,lat:37.488483,platforms:[1,3,4],lines:['교하선','춘천선']};
    STATION_DB['대법원역']={lon:127.00723228442715,lat:37.49168528187326,platforms:[1,2,3,4],lines:['강서선']};
  }
  if(typeof PLATFORM_DB!=='undefined'){
    renameKey(PLATFORM_DB,'일곡역','월곡역');
    renameKey(PLATFORM_DB,'일곡(광주북부)역','일곡역');
    renameKey(PLATFORM_DB,'비산(만안)역','안양천역');
    const splitPlatformLines=(lineNames)=>{
      const result={};
      for(const [platform,info] of Object.entries(PLATFORM_DB['서초역']||{})){
        const lines=(info.l||[]).filter(line=>lineNames.includes(line));
        if(lines.length)result[platform]={g:[...(info.g||[])],l:lines};
      }
      return result;
    };
    PLATFORM_DB['대법원역']=splitPlatformLines(['강서선']);
    PLATFORM_DB['서초역']=splitPlatformLines(['교하선','춘천선']);
  }
})();
