import fs from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
const c={console,Date,Math,Map,Set,JSON,Number,String,Array,Object,RegExp};c.window=c;c.localStorage={getItem:()=>null,setItem:()=>{}};vm.createContext(c);
for(const f of['data/nimbi_demand_data.js','data/nimbi_train_demand.js','js/features/nimbi_demand.js','js/features/nimbi_booking_dynamics.js','js/features/nimbi_inventory.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
c.getFormationType=grade=>grade||'test';c.getCarComposition=formation=>formation==='KTX'?[{car:1,type:'general',totalSeats:900},{car:2,type:'special',totalSeats:99}]:formation==='KTX-이음'?[{car:1,type:'general',totalSeats:381},{car:2,type:'special',totalSeats:35}]:[{car:1,type:'general',rows:20,cols:['A','B','C','D'],totalSeats:80},{car:2,type:'special',rows:5,cols:['A','B','C','D'],totalSeats:20},{car:3,type:'free',totalSeats:0}];
const train={no:'1202',grade:'무궁화호',stops:[{s:'서울',dep:'08:00'},{s:'대전',arr:'09:00',dep:'09:05'},{s:'남대구',arr:'10:00',dep:'10:05'},{s:'부산',arr:'11:00'}]},date='2026-07-28',now=new Date('2026-07-28T07:00:00');
c.loadTickets=()=>[];const a=c.getTrainInventorySnapshot(train,date,now);c.NIMBI_Inventory.invalidate();const b=c.getTrainInventorySnapshot(train,date,now);assert.deepEqual(a.segmentLoads,b.segmentLoads,'결정적 시드');assert.equal(c.buildTrainODDemand(train,date).length,6);assert.ok(c.getBaseDemandIndex(train)>.45);
c.loadTickets=()=>[{id:'u',trainNo:'1202',travelDate:date,status:'active',fromStn:'서울',toStn:'대전',passengerCount:100,seats:[]}];c.NIMBI_Inventory.invalidate();assert.equal(c.getAvailableSeats(train,'서울','대전',date,null,now),0);assert.ok(c.getAvailableSeats(train,'대전','부산',date,null,now)>0);assert.equal(c.getAvailableSeats(train,'서울','부산',date,null,now),0);
assert.equal(c.getTrainCapacity(train).premium,20);assert.equal(c.getTrainCapacity(train).standing,80,'자유석 객차 1칸은 일반 객차 1칸 분량의 판매 정원을 사용');
assert.equal(c.getTrainCapacity(train).standingMode,'standing','무궁화호의 카페객차 판매 상품은 자유석이 아니라 입석이어야 함');
const classState=c.getSeatInventoryState(train,'대전','부산',date,'general',now);assert.equal(classState.available+classState.booked,classState.capacity,'좌석 선택과 등급별 잔여석은 동일 재고를 사용');
assert.ok(c.getBookingProgress(24,'regional')>c.getBookingProgress(168,'regional'));
for(const profile of ['business','leisure','regional']){
  const dayBefore=c.getBookingProgress(24,profile,'2026-07-29'),threeHours=c.getBookingProgress(3,profile,'2026-07-29'),departure=c.getBookingProgress(0,profile,'2026-07-29');
  assert.ok(dayBefore>=.85,'출발 1일 전에는 대부분의 예약이 완료되어야 함');
  assert.ok(threeHours-dayBefore<=.08,'출발 3시간 전 추가 예약은 소수여야 함');
  assert.ok(departure-threeHours<=.04,'출발 직전 추가 예약은 극소수여야 함');
}
assert.ok(c.getBookingProgress(168,'business','2026-07-31')>c.getBookingProgress(168,'business','2026-07-29'),'금요일은 같은 리드타임의 평일보다 선예약 비율이 높아야 함');
assert.ok(c.getBookingProgress(168,'business','2026-08-01')>c.getBookingProgress(168,'business','2026-07-29'),'토요일은 같은 리드타임의 평일보다 선예약 비율이 높아야 함');
assert.ok(c.getBookingProgress(168,'business','2026-08-02')>c.getBookingProgress(168,'business','2026-07-29'),'일요일은 같은 리드타임의 평일보다 선예약 비율이 높아야 함');
const local={s:'대전',dep:'08:00'},capital={s:'서울',dep:'08:00'};assert.ok(c.NIMBI_Demand.getTimeDirectionMultiplier(train,local,capital,date)>c.NIMBI_Demand.getTimeDirectionMultiplier(train,capital,local,date));
c.NIMBI_Inventory.invalidate();assert.equal(c.getTrainInventorySnapshot(train,'2026-07-29',now).userBookings.length,0);
const ktx={...train,no:'1',grade:'KTX'},ktxEum={...train,no:'901',grade:'KTX-이음'};
const ktxDemand=c.NIMBI_Demand.buildRawTrainODDemand(ktx,date).reduce((a,x)=>a+x.demand,0),ktxEumDemand=c.NIMBI_Demand.buildRawTrainODDemand(ktxEum,date).reduce((a,x)=>a+x.demand,0);
const ktxRatio=ktxDemand/c.getTrainCapacity(ktx).total,ktxEumRatio=ktxEumDemand/c.getTrainCapacity(ktxEum).total;
assert.ok(ktxRatio>ktxEumRatio&&ktxRatio<=2.8,'일반 KTX는 인게임 수요만 제한적으로 추가 반영해야 함');
assert.equal(c.getBaseDemandIndex(ktxEum),1,'KTX-이음은 기존 기본 수요 지수를 사용해야 함');
assert.equal(c.getBaseDemandIndex({...train,no:'missing',grade:'KTX-산천'}),1,'KTX-산천은 기존 기본 수요 지수를 사용해야 함');
const rivalA={no:'r1',grade:'무궁화호',passengers:900,line:'시험선',stops:[{s:'서울',dep:'08:00'},{s:'부산',arr:'11:00'}]};
const rivalB={no:'r2',grade:'무궁화호',passengers:900,line:'시험선',stops:[{s:'서울',dep:'08:30'},{s:'부산',arr:'11:25'}]};
c.ALL_TRAINS=[rivalA,rivalB];c.NIMBI_Demand.clearCache();
const shared=c.buildTrainODDemand(rivalA,date)[0],rawShared=c.NIMBI_Demand.buildRawTrainODDemand(rivalA,date)[0],later=c.buildTrainODDemand(rivalB,date)[0];
assert.ok(shared.competitorCount===1&&shared.competitionMultiplier<1,'비슷한 시간대의 직통 경쟁 열차는 수요를 나눠야 함');
assert.ok(later.transferredDemand>0,'매진 예상 열차의 좌석 초과 수요 일부가 다음 열차로 이동해야 함');
assert.ok(shared.demand!==rawShared.demand,'경쟁·초과 수요 보정이 잠재 수요에 실제 반영되어야 함');
c.ALL_TRAINS=[];
const passTrain={no:'pass',grade:'무궁화호',stops:[
  {s:'기점',dep:'08:00'},
  {s:'시간형 통과',arr:'08:20',dep:null},
  {s:'중간 정차',arr:'08:40',dep:'08:41'},
  {s:'문자형 통과',arr:'통과',dep:null},
  {s:'종점',arr:'09:10'}
]};
const serviceStops=c.NIMBI_Demand.getStops(passTrain).map(x=>x.s);
assert.deepEqual(serviceStops,['기점','중간 정차','종점'],'수요와 혼잡도 구간은 실제 정차역만 사용해야 함');
const passDemand=c.buildTrainODDemand(passTrain,date);
assert.equal(passDemand.length,3,'통과역을 제외한 정차역 3곳은 OD 3개만 생성해야 함');
assert.ok(passDemand.every(od=>!od.from.includes('통과')&&!od.to.includes('통과')),'통과역에서 승하차 수요가 생기면 안 됨');
c.NIMBI_Inventory.invalidate();
const passInventory=c.getTrainInventorySnapshot(passTrain,date,now);
assert.deepEqual(passInventory.stops,['기점','중간 정차','종점'],'재고 구간 경계도 정차역과 일치해야 함');
assert.equal(passInventory.segmentLoads.length,2,'통과역을 지나도 승객 수는 다음 정차역까지 유지되어야 함');
c.loadTickets=()=>[{id:'standing-gate',trainNo:'gate',travelDate:'2026-08-28',status:'active',fromStn:'서울',toStn:'부산',passengerCount:100,seatClass:'general',seats:[]}];
const gate={no:'gate',grade:'ITX-마음',stops:[{s:'서울',dep:'08:00'},{s:'부산',arr:'11:00'}]};
c.NIMBI_Inventory.invalidate();const gateState=c.getSeatInventoryState(gate,'서울','부산','2026-08-28','standing',new Date('2026-07-28T08:00:00'));
assert.ok(gateState.eligible&&gateState.threshold===.56,'자유석 객차는 좌석 혼잡도 보통(56%)부터 판매해야 함');
c.getTrainByNo=no=>String(no)===String(train.no)?train:null;c.seatId=(car,row,col)=>`${car.car}호차 ${row}${col}`;c._bArgs={trainNo:train.no,fromStn:'대전',toStn:'부산'};
vm.runInContext(fs.readFileSync('js/features/nimbi_congestion.js','utf8'),c,{filename:'js/features/nimbi_congestion.js'});
const cars=c.getCarComposition(),seatState=c.getSeatInventoryState(train,'대전','부산',date,'general');c.generateVirtualBookings(train.no,date,cars,null,null,'general');
assert.equal(c.getBookedSeats(train.no,date,null,null,'general').size,seatState.booked,'검색 잔여석과 실제 선택 가능한 좌석 수 동기화');
console.log('demand_inventory.test: OK');
