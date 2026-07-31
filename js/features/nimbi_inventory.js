(function(g){
  const cache=new Map,D=()=>g.NIMBI_Demand,B=()=>g.NIMBI_BookingDynamics;
  const find=(stops,from,to)=>{const a=stops.indexOf(from),b=stops.indexOf(to);return a>=0&&b>a?[a,b]:null;};
  let ticketCache=null,ticketCacheAt=0;
  const tickets=()=>{const now=Date.now();if(ticketCache&&now-ticketCacheAt<80)return ticketCache;try{ticketCache=g.loadTickets?.()||[];}catch(e){ticketCache=[];}ticketCacheAt=now;return ticketCache;};
  const add=(loads,a,b,count,capacity)=>{let room=capacity;for(let i=a;i<b;i++)room=Math.min(room,capacity-loads[i]);const n=Math.max(0,Math.min(Math.floor(count),room));for(let i=a;i<b;i++)loads[i]+=n;return n;};
  const rangeMax=(values,a,b)=>{let max=0;for(let i=a;i<b;i++)if(values[i]>max)max=values[i];return max;};
  const ticketSig=(no,date)=>{try{return tickets().filter(x=>String(x.trainNo)===String(no)&&x.travelDate===date&&x.status==='active').map(x=>x.id+':'+x.passengerCount).sort().join('|');}catch(e){return'';}};
  const classKey=x=>x==='special'||x==='premium'?'premium':x==='standing'?'standing':'standard';
  const classCapacity=(cap,cls)=>!cls?cap.total:cls==='special'||cls==='premium'?cap.premium:cls==='standing'?cap.standing:cap.standard;
  const standingThreshold=cap=>cap.standingMode==='free'?.56:.76;

  function snapshot(train,date,now=new Date()){
    if(!train)return null;
    const signature=ticketSig(train.no,date),key=`${train.no}|${date}|${g.NIMBI_DEMAND_VERSION}|${Math.floor(+now/18e5)}`,old=cache.get(key);
    if(old?.signature===signature)return old;
    const stopNames=D().getStops(train).map(x=>x.s),capacity=D().getTrainCapacity(train),length=Math.max(0,stopNames.length-1);
    const segmentLoads=Array(length).fill(0),standingLoads=Array(length).fill(0),userLoads=Array(length).fill(0);
    const userClassLoads={standard:Array(length).fill(0),premium:Array(length).fill(0),standing:Array(length).fill(0)};
    const userBookings=[],seen=new Set;
    for(const ticket of tickets()){
      if(String(ticket.trainNo)!==String(train.no)||ticket.travelDate!==date||ticket.status!=='active'||seen.has(ticket.id))continue;
      seen.add(ticket.id);const od=find(stopNames,ticket.fromStn,ticket.toStn);if(!od)continue;
      const count=Math.max(1,+ticket.passengerCount||ticket.seats?.length||1),isStanding=ticket.seatClass==='standing';
      const accepted=isStanding?add(standingLoads,od[0],od[1],count,capacity.standing):add(segmentLoads,od[0],od[1],count,capacity.total);
      for(let i=od[0];i<od[1];i++){if(!isStanding)userLoads[i]+=accepted;userClassLoads[classKey(ticket.seatClass)][i]+=accepted;}
      userBookings.push({id:ticket.id,fromIndex:od[0],toIndex:od[1],count:accepted,seatClass:ticket.seatClass});
    }
    const departure=B().departureDate(train,date),hours=(departure-now)/36e5,ods=D().buildTrainODDemand(train,date);
    const simulatedBookings=[],simulatedStandingBookings=[],cancellationEvents=[];
    for(const od of ods){
      let wanted=Math.floor(od.demand*B().getBookingProgress(hours,B().getBookingProfile(train,od,date),date));
      const cancellation=B().generateCancellationEvents(train,date,od)[0];
      if(hours<=cancellation.hoursBefore){const released=Math.floor(wanted*cancellation.rate);wanted-=released;if(released)cancellationEvents.push({...cancellation,seats:released,from:od.from,to:od.to});}
      const group=B().generateGroupBookingEvent(train,date,od);if(group&&!group.cancelled)wanted+=group.seats;
      const seated=add(segmentLoads,od.fromIndex,od.toIndex,wanted,capacity.total);
      if(seated)simulatedBookings.push({...od,count:seated});
      const overflow=Math.max(0,wanted-seated),seatRate=rangeMax(segmentLoads,od.fromIndex,od.toIndex)/Math.max(1,capacity.total);
      if(overflow&&capacity.standing>0&&seatRate>=standingThreshold(capacity)){
        const standing=add(standingLoads,od.fromIndex,od.toIndex,overflow,capacity.standing);
        if(standing)simulatedStandingBookings.push({...od,count:standing});
      }
    }
    const noShow=now>=departure?B().getNoShowRate(train,date):0;
    const onboardLoads=segmentLoads.map(x=>Math.max(0,Math.round(x*(1-noShow))));
    const onboardStandingLoads=standingLoads.map(x=>Math.max(0,Math.round(x*(1-noShow))));
    const potential=ods.reduce((a,x)=>a+x.demand,0);
    const result={trainNo:String(train.no),serviceDate:date,capacity,stops:stopNames,segmentLoads,standingLoads,onboardLoads,onboardStandingLoads,
      userLoads,userClassLoads,simulatedBookings,simulatedStandingBookings,userBookings,cancellationEvents,potentialDemand:potential,
      currentBooked:Math.max(0,...segmentLoads),expectedFinalRate:Math.min(1,potential/Math.max(1,capacity.total)),signature};
    cache.set(key,result);return result;
  }
  function classState(train,from,to,date,seatClass='general',now){
    const s=snapshot(train,date,now),od=s&&find(s.stops,from,to);
    if(!s||!od)return{capacity:0,booked:0,simulatedBooked:0,userBooked:0,available:0,eligible:false};
    if(!seatClass){
      const booked=rangeMax(s.segmentLoads,od[0],od[1]);
      return{capacity:s.capacity.total,booked,simulatedBooked:Math.max(0,booked-rangeMax(s.userLoads,od[0],od[1])),
        userBooked:rangeMax(s.userLoads,od[0],od[1]),available:Math.max(0,s.capacity.total-booked),eligible:true};
    }
    const cap=classCapacity(s.capacity,seatClass);
    if(cap<=0)return{capacity:0,booked:0,simulatedBooked:0,userBooked:0,available:0,eligible:false};
    const kind=classKey(seatClass);
    if(kind==='standing'){
      const booked=Math.min(cap,rangeMax(s.standingLoads,od[0],od[1])),userBooked=Math.min(booked,rangeMax(s.userClassLoads.standing,od[0],od[1]));
      const seatedRate=rangeMax(s.segmentLoads,od[0],od[1])/Math.max(1,s.capacity.total),threshold=standingThreshold(s.capacity),eligible=seatedRate>=threshold;
      const rawAvailable=Math.max(0,cap-booked);
      return{capacity:cap,booked,simulatedBooked:Math.max(0,booked-userBooked),userBooked,available:eligible?rawAvailable:0,
        rawAvailable,eligible,threshold,seatedRate,mode:s.capacity.standingMode,label:s.capacity.standingMode==='free'?'자유석':'입석'};
    }
    const used=[],user=[];
    for(let i=od[0];i<od[1];i++){
      const simulated=Math.max(0,s.segmentLoads[i]-s.userLoads[i]);
      user.push(s.userClassLoads[kind][i]);
      used.push(s.userClassLoads[kind][i]+Math.ceil(simulated*cap/Math.max(1,s.capacity.total)));
    }
    const booked=Math.min(cap,Math.max(0,...used)),userBooked=Math.min(booked,Math.max(0,...user));
    return{capacity:cap,booked,simulatedBooked:Math.max(0,booked-userBooked),userBooked,available:Math.max(0,cap-booked),eligible:true};
  }
  const available=(train,from,to,date,seatClass,now)=>classState(train,from,to,date,seatClass,now).available;
  function congestion(train,from,to,date,now){
    const s=snapshot(train,date,now);if(!s)return null;
    const od=find(s.stops,from,to),a=od?.[0]??0,b=od?.[1]??s.onboardLoads.length;
    const booked=rangeMax(s.onboardLoads,a,b),standingBooked=rangeMax(s.onboardStandingLoads,a,b);
    const rate=booked/Math.max(1,s.capacity.total),percent=Math.round(rate*100),standing=classState(train,from,to,date,'standing',now);
    const level=percent<=30?'매우 여유':percent<=55?'여유':percent<=75?'보통':percent<=90?'혼잡':percent<100?'매우 혼잡':standing.available>0?'입석':'매진';
    const seatAvailable=Math.max(0,s.capacity.total-booked);
    return{rate,loadFactor:rate,percent,level,label:level,booked,capacity:s.capacity.total,available:seatAvailable,seatAvailable,
      standingBooked,standingCapacity:s.capacity.standing,standingAvailable:standing.available,standingEligible:standing.eligible,
      standingMode:s.capacity.standingMode,bookableAvailable:seatAvailable+standing.available};
  }
  function invalidate(no,date){
    ticketCache=null;ticketCacheAt=0;
    for(const key of cache.keys())if((!no||key.startsWith(no+'|'))&&(!date||key.includes('|'+date+'|')))cache.delete(key);
  }
  const canBook=(train,from,to,count,date,seatClass,now)=>available(train,from,to,date,seatClass,now)>=count;
  const addBookingToInventory=(train,from,to,count,date,seatClass)=>{const ok=canBook(train,from,to,count,date,seatClass);if(ok)invalidate(train?.no||train,date);return ok;};
  const removeBookingFromInventory=(train,from,to,count,date)=>{invalidate(train?.no||train,date);return true;};
  g.NIMBI_Inventory={getTrainInventorySnapshot:snapshot,getSegmentLoads:(t,d,n)=>snapshot(t,d,n)?.segmentLoads||[],
    getAvailableSeats:available,getSeatInventoryState:classState,canBookOD:canBook,addBookingToInventory,removeBookingFromInventory,
    getCongestion:congestion,getODCongestion:congestion,invalidate,segmentsOverlap:(a,b,c,d)=>a<d&&c<b};
  g.getTrainCapacity=t=>D().getTrainCapacity(t);g.getTrainInventorySnapshot=snapshot;g.getSegmentLoads=(t,d,n)=>snapshot(t,d,n)?.segmentLoads||[];
  g.getAvailableSeats=available;g.getSeatInventoryState=classState;g.canBookOD=canBook;g.addBookingToInventory=addBookingToInventory;
  g.removeBookingFromInventory=removeBookingFromInventory;g.getODCongestion=congestion;g.segmentsOverlap=(a,b,c,d)=>a<d&&c<b;
})(window);
