// 2026-07-31 신설 지역열차 승강장 매핑.
// 사진에서 판독해 시간표 stop.p에 기록한 승강장을 역 정보 화면에서도
// 동일하게 사용하도록 REAL_PLAT에 확정 반영한다. 통과역은 매핑하지 않는다.
(()=>{
  if(typeof REAL_PLAT==='undefined'||typeof ALL_TRAINS==='undefined')return;
  const isRegionalTrain=no=>{
    const n=Number(no);
    return (n>=1241&&n<=1252)||
      (n>=4401&&n<=4436)||
      (n>=681&&n<=700)||
      (n>=801&&n<=822);
  };
  for(const train of ALL_TRAINS){
    if(!isRegionalTrain(train.no))continue;
    const mapped=REAL_PLAT[train.no]||(REAL_PLAT[train.no]={});
    for(const stop of train.stops){
      if(stop.p!=null&&(stop.arr!==stop.dep||stop.arr==null||stop.dep==null)){
        mapped[stop.s]=Number(stop.p);
      }
    }
  }
})();
