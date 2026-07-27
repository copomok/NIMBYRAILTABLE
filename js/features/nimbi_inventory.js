(function(g){
  const cache=new Map,D=()=>g.NIMBI_Demand,B=()=>g.NIMBI_BookingDynamics;
  const find=(stops,from,to)=>{const a=stops.indexOf(from),b=stops.indexOf(to);return a>=0&&b>a?[a,b]:null;};
  const add=(loads,a,b,count,capacity)=>{const room=Math.min(...loads.slice(a,b).map(x=>capacity-x)),n=Math.max(0,Math.min(Math.floor(count),room));for(let i=a;i<b;i++)loads[i]+=n;return n;};
  const ticketSig=(no,date)=>{try{return(g.loadTickets?.()||[]).filter(x=>String(x.trainNo)===String(no)&&x.travelDate===date&&x.status==='active').map(x=>x.id+':'+x.passengerCount).sort().join('|');}catch(e){return'';}};
  const classKey=x=>x==='special'||x==='premium'?'premium':x==='standing'?'standing':'standard';
  function classCapacity(cap,cls){if(!cls)return cap.total;return cls==='special'||cls==='premium'?cap.premium:cls==='standing'?cap.standing:cap.standard;}

  function snapshot(train,date,now=new Date()){
    if(!train)return null;
    const signature=ticketSig(train.no,date),key=`${train.no}|${date}|${NIMBI_DEMAND_VERSION}|${Math.floor(+now/18e5)}`,old=cache.get(key);
    if(old?.signature===signature)return old;
    const stops=D().getStops(train).map(x=>x.s),capacity=D().getTrainCapacity(train),length=Math.max(0,stops.length-1);
    const segmentLoads=Array(length).fill(0),userLoads=Array(length).fill(0);
    const userClassLoads={standard:Array(length).fill(0),premium:Array(length).fill(0),standing:Array(length).fill(0)};
    const userBookings=[],seen=new Set;
    for(const ticket of g.loadTickets?.()||[]){
      if(String(ticket.trainNo)!==String(train.no)||ticket.travelDate!==date||ticket.status!=='active'||seen.has(ticket.id))continue;
      seen.add(ticket.id);const od=find(stops,ticket.fromStn,ticket.toStn);if(!od)continue;
      const count=Math.max(1,+ticket.passengerCount||ticket.seats?.length||1),standing=ticket.seatClass==='standing';
      const accepted=standing?Math.min(count,capacity.standing):add(segmentLoads,od[0],od[1],count,capacity.total);
      for(let i=od[0];i<od[1];i++){if(!standing)userLoads[i]+=accepted;userClassLoads[classKey(ticket.seatClass)][i]+=accepted;}
      userBookings.push({id:ticket.id,fromIndex:od[0],toIndex:od[1],count});
    }
    const departure=B().departureDate(train,date),hours=(departure-now)/36e5,ods=D().buildTrainODDemand(train,date),simulatedBookings=[],cancellationEvents=[];
    for(const od of ods){
      let wanted=Math.floor(od.demand*B().getBookingProgress(hours,B().getBookingProfile(train,od,date),date));
      const cancellation=B().generateCancellationEvents(train,date,od)[0];
      if(hours<=cancellation.hoursBefore){const released=Math.floor(wanted*cancellation.rate);wanted-=released;if(released)cancellationEvents.push({...cancellation,seats:released,from:od.from,to:od.to});}
      const group=B().generateGroupBookingEvent(train,date,od);if(group&&!group.cancelled)wanted+=group.seats;
      const count=add(segmentLoads,od.fromIndex,od.toIndex,wanted,capacity.total);if(count)simulatedBookings.push({...od,count});
    }
    const noShow=now>=departure?B().getNoShowRate(train,date):0,onboardLoads=segmentLoads.map(x=>Math.max(0,Math.round(x*(1-noShow))));
    const result={trainNo:String(train.no),serviceDate:date,capacity,stops,segmentLoads,onboardLoads,userLoads,userClassLoads,simulatedBookings,userBookings,cancellationEvents,
      potentialDemand:ods.reduce((a,x)=>a+x.demand,0),currentBooked:Math.max(0,...segmentLoads),expectedFinalRate:Math.min(1,ods.reduce((a,x)=>a+x.demand,0)/Math.max(1,capacity.total)),signature};
    cache.set(key,result);return result;
  }
  function available(train,from,to,date,seatClass,now){
    return classState(train,from,to,date,seatClass,now).available;
  }
  function classState(train,from,to,date,seatClass='general',now){
    const s=snapshot(train,date,now),od=s&&find(s.stops,from,to);if(!s||!od)return{capacity:0,booked:0,simulatedBooked:0,userBooked:0,available:0};
    const cap=classCapacity(s.capacity,seatClass);
    if(!seatClass)return{capacity:s.capacity.total,booked:Math.max(0,...s.segmentLoads.slice(od[0],od[1])),simulatedBooked:0,userBooked:0,available:Math.max(0,s.capacity.total-Math.max(0,...s.segmentLoads.slice(od[0],od[1])))};
    if(cap<=0)return{capacity:0,booked:0,simulatedBooked:0,userBooked:0,available:0};
    const kind=classKey(seatClass),used=[];
    const user=[];
    for(let i=od[0];i<od[1];i++){const simulated=Math.max(0,s.segmentLoads[i]-s.userLoads[i]);user.push(s.userClassLoads[kind][i]);used.push(s.userClassLoads[kind][i]+Math.ceil(simulated*cap/Math.max(1,s.capacity.total)));}
    const booked=Math.min(cap,Math.max(0,...used)),userBooked=Math.min(booked,Math.max(0,...user));
    return{capacity:cap,booked,simulatedBooked:Math.max(0,booked-userBooked),userBooked,available:Math.max(0,cap-booked)};
  }
  function congestion(train,from,to,date,now){
    const s=snapshot(train,date,now);if(!s)return null;const od=find(s.stops,from,to),loads=od?s.onboardLoads.slice(od[0],od[1]):s.onboardLoads,booked=Math.max(0,...loads),rate=booked/Math.max(1,s.capacity.total),percent=Math.round(rate*100);
    const level=percent<=30?'매우 여유':percent<=55?'여유':percent<=75?'보통':percent<=90?'혼잡':percent<100?'매우 혼잡':'매진';
    return{rate,loadFactor:rate,percent,level,label:level,booked,capacity:s.capacity.total,available:Math.max(0,s.capacity.total-booked)};
  }
  function invalidate(no,date){for(const k of cache.keys())if((!no||k.startsWith(no+'|'))&&(!date||k.includes('|'+date+'|')))cache.delete(k);}
  const addBookingToInventory=(train,from,to,count,date,seatClass)=>{const ok=available(train,from,to,date,seatClass)>=count;if(ok)invalidate(train?.no||train,date);return ok;};
  const removeBookingFromInventory=(train,from,to,count,date)=>{invalidate(train?.no||train,date);return true;};
  g.NIMBI_Inventory={getTrainInventorySnapshot:snapshot,getSegmentLoads:(t,d,n)=>snapshot(t,d,n)?.segmentLoads||[],getAvailableSeats:available,getSeatInventoryState:classState,canBookOD:(t,a,b,n,d,c,z)=>available(t,a,b,d,c,z)>=n,addBookingToInventory,removeBookingFromInventory,getCongestion:congestion,getODCongestion:congestion,invalidate,segmentsOverlap:(a,b,c,d)=>a<d&&c<b};
  g.getTrainCapacity=t=>D().getTrainCapacity(t);g.getTrainInventorySnapshot=snapshot;g.getSegmentLoads=(t,d,n)=>snapshot(t,d,n)?.segmentLoads||[];g.getAvailableSeats=available;g.getSeatInventoryState=classState;g.canBookOD=(t,a,b,n,d,c,z)=>available(t,a,b,d,c,z)>=n;g.addBookingToInventory=addBookingToInventory;g.removeBookingFromInventory=removeBookingFromInventory;g.getODCongestion=congestion;g.segmentsOverlap=(a,b,c,d)=>a<d&&c<b;
})(window);
