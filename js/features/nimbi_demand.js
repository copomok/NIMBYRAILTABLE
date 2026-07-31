(function(g){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const random=s=>hash(s)/4294967296;
  const toMin=v=>{if(!/^\d{1,2}:\d{2}$/.test(v||''))return null;const[a,b]=v.split(':').map(Number);return a*60+b;};
  const stopCache=new WeakMap();
  const stops=t=>{
    if(!t)return[];
    if(stopCache.has(t))return stopCache.get(t);
    const result=(t.stops||[]).filter(x=>toMin(x.arr)!==null||toMin(x.dep)!==null);
    stopCache.set(t,result);
    return result;
  };
  const seenTrains=new Map(),rawCache=new Map(),rawODCache=new Map(),finalCache=new Map(),alternativeCache=new Map();
  const timingCache=new Map(),adjustmentCache=new Map(),transferSourceCache=new Map();
  const profileCache=new Map(),capacityCache=new WeakMap(),baseCache=new WeakMap();
  let routeIndex=null;

  function allTrains(){
    let list=[];
    try{if(typeof ALL_TRAINS!=='undefined'&&Array.isArray(ALL_TRAINS))list=ALL_TRAINS;}catch(e){}
    if(!list.length&&Array.isArray(g.ALL_TRAINS))list=g.ALL_TRAINS;
    return list.length?list:[...seenTrains.values()];
  }
  function profile(name){
    if(profileCache.has(name))return{...profileCache.get(name)};
    if(g.NIMBI_STATION_DEMAND_PROFILE?.[name]){
      const result={...g.NIMBI_STATION_DEMAND_PROFILE[name]};profileCache.set(name,result);return{...result};
    }
    const pax=+g.STATION_PAX?.[name],weight=pax>0?clamp(.72+Math.sqrt(pax/100)*.55,.72,1.27):1;
    const result={origin:weight,destination:weight,business:1,leisure:1,transfer:pax>=55?1.15:1,capital:false};
    profileCache.set(name,result);return{...result};
  }
  function carSeats(car){
    if(+car?.totalSeats>0)return +car.totalSeats;
    const cols=Array.isArray(car?.cols)?car.cols.length:0,rows=+car?.rows||0;
    return Math.max(0,rows*cols-(car?.missingSeats?.length||0));
  }
  function capacity(train){
    if(capacityCache.has(train))return{...capacityCache.get(train)};
    try{
      if(g.getCarComposition&&g.getFormationType){
        const cars=g.getCarComposition(g.getFormationType(train.grade,train.no))||[];
        const result={standard:0,premium:0,standing:0,standingMode:'standing',freeCars:0};
        const seated=[],standardCars=[];
        for(const car of cars){
          const count=carSeats(car);
          if(car.type==='free'||car.type==='cafe'){result.freeCars++;continue;}
          if(car.type==='special'||car.type==='premium')result.premium+=count;
          else{result.standard+=count;if(count>0)standardCars.push(count);}
          if(count>0)seated.push(count);
        }
        const car1=carSeats(cars.find(car=>+car.car===1))||seated[0]||0;
        const reference=standardCars.length?standardCars:seated;
        const typical=reference.length?Math.round(reference.reduce((a,b)=>a+b,0)/reference.length):car1;
        const alwaysStanding=train.grade==='무궁화호'||train.grade==='ITX-새마을';
        result.standingMode=result.freeCars&&!alwaysStanding?'free':'standing';
        result.standing=result.freeCars?Math.round(typical*result.freeCars):Math.round(car1*.5);
        result.total=result.standard+result.premium;
        if(result.total>0){capacityCache.set(train,result);return{...result};}
      }
    }catch(e){}
    const total=/KTX$/.test(train?.grade)?999:/산천|SRT/.test(train?.grade)?453:/이음/.test(train?.grade)?416:/청춘/.test(train?.grade)?520:/새마을/.test(train?.grade)?312:/마음/.test(train?.grade)?208:360;
    const cars=/KTX$/.test(train?.grade)?20:/산천|SRT/.test(train?.grade)?10:/이음/.test(train?.grade)?8:/청춘/.test(train?.grade)?8:/ITX/.test(train?.grade)?6:5;
    const result={total,standard:total,premium:0,standing:Math.round(total/cars*.5),standingMode:'standing',freeCars:0};
    capacityCache.set(train,result);return{...result};
  }
  function gamePassengers(train){
    const direct=[train?.passengers,train?.pax,train?.passengerCount,train?.pax_boarded].map(Number).find(Number.isFinite);
    if(direct>0)return direct;
    const saved=+g.NIMBI_GAME_PAX_PER_RUN?.[String(+train?.no)];
    return saved>0?saved:null;
  }
  const gradeGroup=grade=>/KTX|SRT/.test(grade)?'high':/ITX/.test(grade)?'itx':'local';
  const exactKtx=train=>train?.grade==='KTX';
  function inferredRouteDemandIndex(train){
    const list=stops(train),values=list.map(s=>{
      const p=profile(s.s);
      return Math.sqrt(Math.max(.3,(p.origin||1)*(p.destination||1)))*(p.transfer||1);
    });
    const mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:1;
    const endpoint=values.length>1?(values[0]+values.at(-1))/2:mean;
    const linePeers=allTrains().filter(x=>x!==train&&x.line===train?.line);
    const peerIndexes=linePeers.map(x=>{
      const p=gamePassengers(x),cap=capacity(x).total;
      return p>0&&cap>0?clamp(.55+Math.log1p(p/cap)*.38,.45,1.55):null;
    }).filter(Number.isFinite);
    const peer=peerIndexes.length?peerIndexes.sort((a,b)=>a-b)[Math.floor(peerIndexes.length/2)]:1;
    return clamp(peer*.55+mean*.25+endpoint*.20,.68,1.42);
  }
  function baseDemandIndex(train){
    if(baseCache.has(train))return baseCache.get(train);
    const pax=gamePassengers(train),cap=Math.max(1,capacity(train).total),group=gradeGroup(train.grade);
    if(!(pax>0)){
      const value=group==='high'?(exactKtx(train)?1.05:1):inferredRouteDemandIndex(train);
      baseCache.set(train,value);return value;
    }
    if(exactKtx(train)){const value=clamp(.64+Math.log1p(pax/(cap*.42))*.68,.92,1.85);baseCache.set(train,value);return value;}
    const raw=clamp(.55+Math.log1p(pax/cap)*.38,.45,1.55),floor=group==='high'?.82:group==='itx'?.70:.55;
    const value=Math.max(floor,raw);baseCache.set(train,value);return value;
  }
  function distanceKm(train,a,b){
    try{const value=+g.routeDistanceKm?.(train,a.s,b.s);if(value>0)return value;}catch(e){}
    const from=toMin(a.dep||a.arr),to=toMin(b.arr||b.dep);
    return from!=null&&to!=null?Math.max(8,(to<from?to+1440:to)-from)*1.25:30;
  }
  function distancePreference(train,km){
    const group=gradeGroup(train.grade);
    return km<50?group==='high'?.75:group==='itx'?1.12:1.1:
      km<150?group==='high'?1.03:group==='itx'?1.1:1:
      km<250?group==='high'?1.18:group==='itx'?1.02:.88:
      group==='high'?1.34:group==='itx'?.85:.7;
  }
  function directionMultiplier(train,a,b,date){
    const day=new Date(date+'T12:00:00'),hour=Math.floor((toMin(a.dep||a.arr)||720)/60),origin=profile(a.s),dest=profile(b.s);
    let value=1;
    if(day.getDay()>0&&day.getDay()<6&&hour>=7&&hour<10)value*=dest.capital&&!origin.capital?1.34:origin.capital&&!dest.capital?.92:1.08;
    if(day.getDay()>0&&day.getDay()<6&&hour>=17&&hour<21)value*=origin.capital&&!dest.capital?1.36:dest.capital&&!origin.capital?.96:1.1;
    if(day.getDay()===5&&hour>=16&&origin.capital&&!dest.capital)value*=1.14;
    if(day.getDay()===0&&hour>=14&&dest.capital&&!origin.capital)value*=1.22;
    if(day.getDay()===6&&hour<12&&(dest.leisure||1)>1.25)value*=1.2;
    return clamp(value,.78,1.48);
  }
  function calendarMultiplier(date,b){
    const day=new Date(date+'T12:00:00'),holiday=typeof g._simIsKoreanHoliday==='function'&&g._simIsKoreanHoliday(day);
    let value=g.NIMBI_DAY_MULTIPLIERS?.[day.getDay()]||1;
    if(holiday)value=Math.max(value,1.1);
    const month=day.getMonth()+1;
    if((month===7||month===8)&&(profile(b.s).leisure||1)>1.2)value*=1.12;
    if((month===10||month===11)&&(profile(b.s).leisure||1)>1.2)value*=1.08;
    return clamp(value,.7,1.65);
  }
  function odScore(train,a,b,date){
    const km=distanceKm(train,a,b);
    return profile(a.s).origin*profile(b.s).destination*clamp(.8+Math.log1p(km)/9,.85,1.35)*
      distancePreference(train,km)*directionMultiplier(train,a,b,date)*calendarMultiplier(date,b)*
      baseDemandIndex(train)*(.91+random(`${train.no}|${date}|${a.s}|${b.s}`)*.18);
  }
  function rawDemand(train,date){
    seenTrains.set(String(train.no),train);
    const key=`${train.no}|${date}|${g.NIMBI_DEMAND_VERSION}|raw`;
    if(rawCache.has(key))return rawCache.get(key);
    const list=stops(train),ods=[];
    for(let i=0;i<list.length-1;i++)for(let j=i+1;j<list.length;j++){
      if(list[i].s===list[j].s)continue;
      ods.push({from:list[i].s,to:list[j].s,fromIndex:i,toIndex:j,score:odScore(train,list[i],list[j],date)});
    }
    if(!ods.length)return[];
    const cap=capacity(train).total,group=gradeGroup(train.grade),gradeBase=group==='high'?1.35:group==='itx'?1:.82;
    const routeScale=clamp(.75+Math.sqrt(list.length)/5,.9,1.8),maxDemand=exactKtx(train)?2.8:2.4;
    const target=Math.round(clamp(cap*gradeBase*baseDemandIndex(train)*routeScale,cap*.45,cap*maxDemand));
    const sum=ods.reduce((a,x)=>a+x.score,0)||1;
    let assigned=0;
    for(const od of ods){const exact=target*od.score/sum;od.demand=Math.floor(exact);od.frac=exact-od.demand;assigned+=od.demand;}
    [...ods].sort((a,b)=>b.frac-a.frac).slice(0,target-assigned).forEach(od=>od.demand++);
    ods.sort((a,b)=>a.fromIndex-b.fromIndex||a.toIndex-b.toIndex);
    rawCache.set(key,ods);
    rawODCache.set(key,new Map(ods.map(od=>[`${od.from}\u0000${od.to}`,od])));
    return ods;
  }
  function odTiming(train,from,to){
    const key=`${train.no}|${from}\u0000${to}|${g.NIMBI_DEMAND_VERSION}`;
    if(timingCache.has(key))return timingCache.get(key);
    const list=stops(train),a=list.findIndex(x=>x.s===from),b=list.findIndex((x,i)=>i>a&&x.s===to);
    if(a<0||b<=a){timingCache.set(key,null);return null;}
    let dep=toMin(list[a].dep||list[a].arr),arr=toMin(list[b].arr||list[b].dep);
    if(dep==null||arr==null){timingCache.set(key,null);return null;}
    if(arr<dep)arr+=1440;
    const result={a,b,dep,arr,duration:arr-dep};
    timingCache.set(key,result);return result;
  }
  function gradeSimilarity(a,b){
    const x=gradeGroup(a.grade),y=gradeGroup(b.grade);
    return x===y?1:(x==='local'||y==='local')?.68:.82;
  }
  function lowerBoundByDeparture(entries,minute){
    let lo=0,hi=entries.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(entries[mid].timing.dep<minute)lo=mid+1;else hi=mid;}
    return lo;
  }
  function departureWindow(entries,minute){
    const slice=(from,to)=>entries.slice(lowerBoundByDeparture(entries,from),lowerBoundByDeparture(entries,to+1));
    const from=minute-60,to=minute+60;
    const result=from<0?[...slice(0,to),...slice(1440+from,1439)]:
      to>=1440?[...slice(from,1439),...slice(0,to-1440)]:slice(from,to);
    result.sort((a,b)=>a.order-b.order);
    return result;
  }
  function alternatives(train,od){
    const cacheKey=`${train.no}|${od.from}|${od.to}|${g.NIMBI_DEMAND_VERSION}`;
    if(alternativeCache.has(cacheKey))return alternativeCache.get(cacheKey);
    const own=odTiming(train,od.from,od.to);if(!own)return[];
    const result=[];
    prepareCompetitionIndex();
    const routeKey=`${od.from}\u0000${od.to}`;
    const candidates=departureWindow(routeIndex.get(routeKey)||[],own.dep);
    for(const entry of candidates){
      const other=entry.train;
      if(other===train||String(other.no)===String(train.no))continue;
      const timing=entry.timing;
      let delta=Math.abs(timing.dep-own.dep);delta=Math.min(delta,Math.abs(delta-1440));
      if(delta>60)continue;
      const ratio=Math.max(timing.duration,own.duration)/Math.max(1,Math.min(timing.duration,own.duration));
      if(ratio>1.5)continue;
      const similarity=(1-delta/75)*clamp(1-(ratio-1)*1.4,.35,1)*gradeSimilarity(train,other);
      if(similarity>.12)result.push({train:other,timing,similarity});
    }
    alternativeCache.set(cacheKey,result);
    return result;
  }
  function prepareCompetitionIndex(){
    if(routeIndex)return routeIndex;
    routeIndex=new Map();
    for(const item of allTrains()){
      const list=stops(item);
      for(let i=0;i<list.length-1;i++){
        const dep=toMin(list[i].dep||list[i].arr);if(dep==null)continue;
        for(let j=i+1;j<list.length;j++){
          if(list[i].s===list[j].s)continue;
          let arr=toMin(list[j].arr||list[j].dep);if(arr==null)continue;if(arr<dep)arr+=1440;
          const key=`${list[i].s}\u0000${list[j].s}`;
          if(!routeIndex.has(key))routeIndex.set(key,[]);
          const entries=routeIndex.get(key),entry={train:item,timing:{a:i,b:j,dep,arr,duration:arr-dep},order:entries.length};
          entries.push(entry);
        }
      }
    }
    for(const entries of routeIndex.values())entries.sort((a,b)=>a.timing.dep-b.timing.dep||a.order-b.order);
    return routeIndex;
  }
  function demandForOD(train,date,from,to){
    const key=`${train.no}|${date}|${g.NIMBI_DEMAND_VERSION}|raw`;
    if(!rawCache.has(key))rawDemand(train,date);
    return rawODCache.get(key)?.get(`${from}\u0000${to}`)?.demand||0;
  }
  function transferSourceState(train,date,from,to){
    const key=`${train.no}|${date}|${from}\u0000${to}|${g.NIMBI_DEMAND_VERSION}`;
    if(transferSourceCache.has(key))return transferSourceCache.get(key);
    const unmet=Math.max(0,demandForOD(train,date,from,to)-capacity(train).total);
    if(!unmet){
      const empty={unmet:0,weightSum:1,targets:new Map()};
      transferSourceCache.set(key,empty);return empty;
    }
    const alternativesForSource=alternatives(train,{from,to});
    const result={unmet,weightSum:alternativesForSource.reduce((a,x)=>a+x.similarity,0)||1,
      targets:new Map(alternativesForSource.map(x=>[String(x.train.no),x]))};
    transferSourceCache.set(key,result);return result;
  }
  function competitionAdjustment(train,od,date){
    const cacheKey=`${train.no}|${date}|${od.from}\u0000${od.to}|${g.NIMBI_DEMAND_VERSION}`;
    if(adjustmentCache.has(cacheKey))return adjustmentCache.get(cacheKey);
    const peers=alternatives(train,od);
    if(!peers.length){
      const empty={multiplier:1,incoming:0,competitors:0};
      adjustmentCache.set(cacheKey,empty);return empty;
    }
    const totalScore=peers.reduce((a,x)=>a+x.similarity,0);
    const multiplier=clamp(1/(1+totalScore*.25),.60,1);
    let incoming=0;
    for(const source of peers){
      const sourceState=transferSourceState(source.train,date,od.from,od.to);
      if(!sourceState.unmet)continue;
      const target=sourceState.targets.get(String(train.no));if(!target)continue;
      const forwardMinutes=(target.timing.dep-source.timing.dep+1440)%1440;
      if(forwardMinutes<=0||forwardMinutes>60)continue;
      const moveRate=.20+.35*clamp(target.similarity,0,1);
      incoming+=sourceState.unmet*moveRate*target.similarity/sourceState.weightSum;
    }
    const result={multiplier,incoming,competitors:peers.length};
    adjustmentCache.set(cacheKey,result);return result;
  }
  function buildDemand(train,date){
    seenTrains.set(String(train.no),train);
    const key=`${train.no}|${date}|${g.NIMBI_DEMAND_VERSION}|final`;
    if(finalCache.has(key))return finalCache.get(key).map(x=>({...x}));
    const result=rawDemand(train,date).map(od=>{
      const adjustment=competitionAdjustment(train,od,date);
      return{...od,demand:Math.max(0,Math.round(od.demand*adjustment.multiplier+adjustment.incoming)),
        competitionMultiplier:adjustment.multiplier,transferredDemand:Math.round(adjustment.incoming),competitorCount:adjustment.competitors};
    });
    finalCache.set(key,result);
    return result.map(x=>({...x}));
  }
  function clearCache(){
    rawCache.clear();rawODCache.clear();finalCache.clear();alternativeCache.clear();timingCache.clear();adjustmentCache.clear();transferSourceCache.clear();
    profileCache.clear();routeIndex=null;
  }
  g.NIMBI_Demand={clamp,hash,random,toMin,getStops:stops,getStationDemandProfile:profile,getTrainCapacity:capacity,
    getGamePassengerCount:gamePassengers,getBaseDemandIndex:baseDemandIndex,getInferredRouteDemandIndex:inferredRouteDemandIndex,
    getDistanceGradePreference:distancePreference,getTimeDirectionMultiplier:directionMultiplier,getODDemandScore:odScore,
    buildRawTrainODDemand:rawDemand,buildTrainODDemand:buildDemand,getCompetitionAdjustment:competitionAdjustment,
    prepareCompetitionIndex,clearCache};
  g.getBaseDemandIndex=baseDemandIndex;g.buildTrainODDemand=buildDemand;g.getStationDemandProfile=profile;
})(window);
