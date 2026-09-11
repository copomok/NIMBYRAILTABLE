/* 새 인게임 파일에서 추출한 북한권 신설·이설역 좌표와 승강장. */
(()=>{
  if(typeof STATION_DB==='undefined'||typeof NIMBI_NORTH_INGAME_STATIONS==='undefined')return;
  for(const [name,entry] of Object.entries(NIMBI_NORTH_INGAME_STATIONS))STATION_DB[name]={...entry};
  const aliases={
    강계:'강계역ㄴ',청단:'김일성 벽화',금곡리:'금곡로동자구',모리온:'Coffee Machine',
    블라디보스토크:'Владивосток (블라디보스토크역)',샘물동:'만포',
    은산:'은산읍',북창:'북창읍',룡연:'룡연읍'
  };
  for(const [name,source] of Object.entries(aliases))if(NIMBI_NORTH_INGAME_STATIONS[source])STATION_DB[name]={...NIMBI_NORTH_INGAME_STATIONS[source]};
  STATION_DB['송정(부산)']={lon:129.20249776231074,lat:35.1880063523589,platforms:[1,2],lines:['동해선']};
})();
