// NIMBY Rail Track Semantic Analyzer
// Raw s/d polylines -> exact-connectivity graph -> corridors -> semantic track types -> platform relations.
(function(global){
  'use strict';
  const VERSION='20260727.2',MEM=new Map(),PATTERN_KEY='nimbi_track_semantic_patterns_v2';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const escKey=v=>String(v==null?'':v).replace(/[|:]/g,'_');
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  function normalizeStops(raw,total){
    const ss=(raw||[]).map(Number),n=ss.length;if(!n)return ss;ss[0]=0;
    for(let i=1;i<n;i++)if(!Number.isFinite(ss[i])||ss[i]<=ss[i-1]){
      let j=i+1;while(j<n&&(!Number.isFinite(ss[j])||ss[j]<=ss[i-1]))j++;
      const end=j<n?ss[j]:Math.max(Number(total)||ss[i-1]+1,ss[i-1]+1);
      for(let k=i;k<j;k++)ss[k]=ss[i-1]+(end-ss[i-1])*(k-i+1)/(j-i+1);
    }
    return ss;
  }
  function routeDefs(line,track){
    const out=[{id:'main',label:line.name,names:line.stations,ss:normalizeStops(track.ss,track.v),rn:track.rn||[],v:Number(track.v)||0,raw:track}];
    (track.b||[]).forEach((b,i)=>out.push({id:`branch:${i}`,label:b.lbl||`지선 ${i+1}`,names:b.names||[],ss:normalizeStops(b.ss,b.v),rn:b.rn||[],v:Number(b.v)||0,raw:b}));
    return out;
  }
  function makeGraph(route){
    const nodes=[],edges=[],nodeByKey=new Map(),runEdges=[];
    const snapNode=(s,d,runIndex,pointIndex)=>{
      // 실제 선로 좌표가 가까운 경우만 동일 노드로 합친다. 중간 교차는 높이 정보가 없으므로 연결하지 않는다.
      const qs=Math.round(s/24),qd=Math.round(d/1.2);let id=null,best=Infinity;
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const candidate of nodeByKey.get(`${qs+a}:${qd+b}`)||[]){
        const n=nodes[candidate],ds=Math.abs(n.s-s),dd=Math.abs(n.d-d);if(ds>24||dd>1.05)continue;
        const distance=ds/24+dd/1.05;if(distance<best){best=distance;id=candidate;}
      }
      if(id==null){id=nodes.length;const key=`${qs}:${qd}`;(nodeByKey.get(key)||nodeByKey.set(key,[]).get(key)).push(id);nodes.push({id,s,d,n:1,edges:[],runs:new Set([runIndex]),points:[[runIndex,pointIndex]]});}
      else{const n=nodes[id];n.s=(n.s*n.n+s)/(n.n+1);n.d=(n.d*n.n+d)/(n.n+1);n.n++;n.runs.add(runIndex);n.points.push([runIndex,pointIndex]);}
      return id;
    };
    route.rn.forEach((run,ri)=>{
      const re=[];let prev=null;
      for(let i=0;i+1<run.length;i+=2){
        const s=Number(run[i]),d=Number(run[i+1]);if(!Number.isFinite(s)||!Number.isFinite(d))continue;
        const nid=snapNode(s,d,ri,i/2);
        if(prev!=null&&prev!==nid){
          const a=nodes[prev],b=nodes[nid],eid=edges.length;
          edges.push({id:eid,a:prev,b:nid,run:ri,length:Math.hypot(b.s-a.s,b.d-a.d),corridor:null});
          nodes[prev].edges.push(eid);nodes[nid].edges.push(eid);re.push(eid);
        }
        prev=nid;
      }
      runEdges[ri]=re;
    });
    nodes.forEach(n=>{n.degree=n.edges.length;n.kind=n.degree<=1?'end':n.degree>=4?'intersection':n.degree===3?'switch':'track';});
    // Exact connected components.
    const components=[];let compId=0;
    nodes.forEach(start=>{if(start.component!=null)return;const stack=[start.id],ns=[],es=new Set();start.component=compId;
      while(stack.length){const id=stack.pop(),n=nodes[id];ns.push(id);n.edges.forEach(eid=>{es.add(eid);const e=edges[eid],other=e.a===id?e.b:e.a;if(nodes[other].component==null){nodes[other].component=compId;stack.push(other);}});}
      components.push({id:compId,nodes:ns,edges:[...es]});compId++;
    });
    // Corridors are maximal chains between junction/end nodes. They are the semantic classification unit.
    const corridors=[],used=new Set();
    const walk=(start,eid)=>{
      const edgeIds=[],nodeIds=[start];let node=start,edgeId=eid;
      while(edgeId!=null&&!used.has(edgeId)){
        used.add(edgeId);edgeIds.push(edgeId);const e=edges[edgeId],next=e.a===node?e.b:e.a;nodeIds.push(next);node=next;
        if(nodes[node].degree!==2)break;
        edgeId=nodes[node].edges.find(x=>!used.has(x));if(edgeId==null)break;
      }
      return {edgeIds,nodeIds};
    };
    nodes.filter(n=>n.degree!==2).forEach(n=>n.edges.forEach(eid=>{if(!used.has(eid)){const w=walk(n.id,eid);corridors.push({id:corridors.length,...w});}}));
    edges.forEach(e=>{if(!used.has(e.id)){const w=walk(e.a,e.id);corridors.push({id:corridors.length,...w});}});
    corridors.forEach(c=>{c.edgeIds.forEach(eid=>{edges[eid].corridor=c.id;});
      const cn=c.nodeIds.map(id=>nodes[id]),ends=[cn[0],cn[cn.length-1]];
      c.length=c.edgeIds.reduce((n,eid)=>n+edges[eid].length,0);c.minS=Math.min(...cn.map(n=>n.s));c.maxS=Math.max(...cn.map(n=>n.s));
      c.minD=Math.min(...cn.map(n=>n.d));c.maxD=Math.max(...cn.map(n=>n.d));c.deadEnds=ends.filter(n=>n.degree<=1).length;
      c.junctions=ends.filter(n=>n.degree>=3).length;c.component=cn[0]?.component??0;c.stationIds=[];c.platformLinks=0;c.trainUsage=0;c.directionMask=0;
    });
    return {nodes,edges,components,corridors,runEdges};
  }
  function servicePairUsage(schedule){
    const map=new Map();if(!schedule||!Array.isArray(schedule.t)||!Array.isArray(schedule.s))return map;
    schedule.t.forEach(f=>{const seq=[];for(let i=2;i<f.length;i+=3){const s=schedule.s[f[i]];if(s!=null&&seq[seq.length-1]!==s)seq.push(s);}
      for(let i=0;i+1<seq.length;i++){const a=seq[i],b=seq[i+1],key=[a,b].sort().join('|'),v=map.get(key)||{count:0,dirs:new Set()};v.count++;v.dirs.add(`${a}>${b}`);map.set(key,v);}
    });return map;
  }
  function stationTrackCuts(route,graph,platformResolver){
    graph.platformEntries=[];
    const stations=route.names.map((name,i)=>({index:i,name,s:route.ss[i],platforms:(platformResolver&&platformResolver(route,i))||[],tracks:[],junctions:0}));
    stations.forEach(st=>{
      const cuts=[];
      graph.edges.forEach(e=>{const a=graph.nodes[e.a],b=graph.nodes[e.b],lo=Math.min(a.s,b.s),hi=Math.max(a.s,b.s);if(st.s<lo-2||st.s>hi+2||Math.abs(b.s-a.s)<1)return;
        const f=clamp((st.s-a.s)/(b.s-a.s),0,1),d=a.d+(b.d-a.d)*f;cuts.push({d,corridor:e.corridor,edge:e.id});
      });
      cuts.sort((a,b)=>a.d-b.d);cuts.forEach(c=>{const last=st.tracks[st.tracks.length-1];
        if(last&&Math.abs(last.d-c.d)<=2.2){last.d=(last.d*last.n+c.d)/(last.n+1);last.n++;last.corridors.add(c.corridor);last.edges.push(c.edge);}
        else st.tracks.push({d:c.d,n:1,corridors:new Set([c.corridor]),edges:[c.edge]});
      });
      const near=graph.nodes.filter(n=>Math.abs(n.s-st.s)<=110);st.junctions=near.filter(n=>n.degree>=3).length;
      st.tracks.forEach(t=>t.corridors.forEach(cid=>{const c=graph.corridors[cid];if(c&&!c.stationIds.includes(st.index))c.stationIds.push(st.index);}));
      st.platformEntries=st.tracks.map((t,index)=>{
        const entry={id:`platform:${st.index}:${index}`,kind:'platform-entry',stationIndex:st.index,stationName:st.name,s:st.s,d:t.d,edges:[...t.edges],corridors:[...t.corridors]};
        graph.platformEntries.push(entry);return entry.id;
      });
    });
    return stations;
  }
  function addTrafficFeatures(route,graph,stations,pairUsage,geo){
    graph.corridors.forEach(c=>{
      c.stationIds.sort((a,b)=>a-b);c.stationLinks=c.stationIds.length;
      c.platformLinks=c.stationIds.reduce((sum,i)=>sum+(stations[i].platforms?.length||0),0);
      for(let i=0;i+1<route.names.length;i++){
        const lo=route.ss[i],hi=route.ss[i+1],gap=Math.max(1,hi-lo),overlap=Math.max(0,Math.min(c.maxS,hi)-Math.max(c.minS,lo));
        if(overlap<Math.min(120,gap*.08))continue;
        const u=pairUsage.get([route.names[i],route.names[i+1]].sort().join('|'));
        if(u){c.trainUsage+=u.count*clamp(overlap/gap,.15,1);c.directionMask|=u.dirs.size>1?3:1;}
      }
      c.bidirectional=c.directionMask===3;
      c.nearTerminal=c.minS<=180||c.maxS>=Math.max(0,route.v-180);
      c.depotNearby=false;
      if(route.id==='main')for(const d of (geo&&geo.d)||[]){const ds=route.ss[d.j];if(ds!=null&&(Math.abs(c.minS-ds)<650||Math.abs(c.maxS-ds)<650)){c.depotNearby=true;break;}}
    });
  }
  function classifyCorridors(route,graph){
    const total=Math.max(1,route.v||route.ss[route.ss.length-1]||1);
    graph.corridors.forEach(c=>{
      const lenN=clamp(c.length/Math.max(400,total*.08),0,3),short=c.length<900?1:0,noPlatform=c.platformLinks===0?1:0;
      const connected=c.junctions>0,stationEvidence=c.stationLinks>0,trafficEvidence=c.trainUsage>0;
      const scores={
        main:route.id==='main'?c.trainUsage*.18+c.stationLinks*3.2+lenN*3.5+(c.bidirectional?4:0)+Math.min(4,c.platformLinks*.35)-c.deadEnds*.5:0,
        branch:route.id!=='main'?c.trainUsage*.18+c.stationLinks*3.2+lenN*3.5+(c.bidirectional?4:0)+Math.min(4,c.platformLinks*.35)-c.deadEnds*.5:c.stationLinks*2.4+lenN*2.8+c.junctions*2+(c.trainUsage?2:0),
        siding:(connected&&(stationEvidence||c.platformLinks)?c.platformLinks*.8+c.junctions*2.5+short*2+(c.stationLinks===1?2:0):0),
        refuge:(connected&&c.platformLinks&&c.deadEnds===0?c.platformLinks*.7+c.junctions*2+short*1.5:0),
        yard:(c.depotNearby&&c.deadEnds&&noPlatform?9+c.deadEnds*3+short*2:0),
        turnback:(c.nearTerminal&&c.platformLinks&&c.deadEnds?5+c.deadEnds*2+short*2:0)
      };
      const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]),top=ranked[0],second=ranked[1];
      const confidence=clamp((top[1]-second[1])/Math.max(3,top[1]),0,1);
      const evidenced=top[0]==='main'||top[0]==='branch'
        ? trafficEvidence||c.stationLinks>=2
        : top[0]==='yard'||top[0]==='turnback'||connected;
      c.scores=scores;c.confidence=confidence;c.type=(evidenced&&top[1]>=4&&confidence>=.12)?top[0]:'unknown';
    });
    // The longest/highest-traffic corridor in every substantial route is a main/branch reference,
    // but only when evidence exists. This is route-level evidence, not a station exception.
    const best=[...graph.corridors].sort((a,b)=>(b.trainUsage-a.trainUsage)||(b.stationLinks-a.stationLinks)||(b.length-a.length))[0];
    if(best&&(best.trainUsage>0||best.stationLinks>=2)){best.type=route.id==='main'?'main':'branch';best.confidence=Math.max(best.confidence,.62);}
    graph.components.forEach(component=>{
      component.corridors=graph.corridors.filter(c=>c.component===component.id).map(c=>c.id);
      const votes={};component.corridors.forEach(id=>{const c=graph.corridors[id];if(c.type==='unknown')return;votes[c.type]=(votes[c.type]||0)+Math.max(1,c.length)*Math.max(.1,c.confidence);});
      const ranked=Object.entries(votes).sort((a,b)=>b[1]-a[1]),sum=ranked.reduce((n,x)=>n+x[1],0);
      component.type=ranked[0]?.[0]||'unknown';
      component.confidence=ranked.length?clamp((ranked[0][1]-(ranked[1]?.[1]||0))/Math.max(1,sum),0,1):0;
      component.scores=votes;
    });
  }
  function platformBlocks(trackDs){
    const blocks=[];if(!trackDs.length)return blocks;
    if(trackDs.length===1)return [{kind:'outside',d:trackDs[0],side:'right',confidence:.45}];
    if(trackDs.length===2)return [{kind:'outside',d:trackDs[0],side:'left',confidence:.8},{kind:'outside',d:trackDs[1],side:'right',confidence:.8}];
    let k=0;if(trackDs.length%2){blocks.push({kind:'outside',d:trackDs[0],side:'left',confidence:.55});k=1;}
    for(;k+1<trackDs.length;k+=2)blocks.push({kind:'between',a:trackDs[k],b:trackDs[k+1],confidence:.72});
    return blocks;
  }
  function encodeBlockPattern(trackDs,blocks){
    return blocks.map(b=>b.kind==='between'
      ?{kind:'between',a:trackDs.indexOf(b.a),b:trackDs.indexOf(b.b),confidence:b.confidence}
      :{kind:'outside',track:trackDs.indexOf(b.d),side:b.side,confidence:b.confidence});
  }
  function applyBlockPattern(trackDs,pattern){
    if(!Array.isArray(pattern))return null;
    const blocks=[];
    for(const b of pattern){
      if(b.kind==='between'&&trackDs[b.a]!=null&&trackDs[b.b]!=null)blocks.push({kind:'between',a:trackDs[b.a],b:trackDs[b.b],confidence:b.confidence});
      else if(b.kind==='outside'&&trackDs[b.track]!=null)blocks.push({kind:'outside',d:trackDs[b.track],side:b.side,confidence:b.confidence});
      else return null;
    }
    return blocks;
  }
  function consecutiveGroups(items,keyFn){
    const by={};items.forEach(p=>{const k=keyFn(p);(by[k]=by[k]||[]).push(p);});const out=[];
    Object.keys(by).forEach(k=>{const a=by[k].sort((x,y)=>x.pn-y.pn);let g=[];a.forEach(p=>{if(g.length&&p.pn>g[g.length-1].pn+1){out.push({key:k,items:g});g=[];}g.push(p);});if(g.length)out.push({key:k,items:g});});
    return out;
  }
  function loadPatterns(){try{return JSON.parse(localStorage.getItem(PATTERN_KEY)||'{}')||{};}catch(e){return {};}}
  function savePatterns(p){try{localStorage.setItem(PATTERN_KEY,JSON.stringify(p));}catch(e){}}
  function buildStationSemantics(route,graph,stations,lineColor){
    const patterns=loadPatterns();
    stations.forEach(st=>{
      const scored=st.tracks.map(t=>{const cs=[...t.corridors].map(id=>graph.corridors[id]).filter(Boolean),best=[...cs].sort((a,b)=>(b.scores?.main||0)-(a.scores?.main||0))[0];
        return {...t,corridors:[...t.corridors],type:best?.type||'unknown',confidence:best?.confidence||0,mainScore:best?.scores?.main||0,connected:cs.some(c=>c.junctions>0)};});
      const routeTokens=[route.label,...route.names].flatMap(v=>String(v||'').split(/[\s→\-_/()]+/)).filter(v=>v.length>=2);
      const routeSpecific=route.id==='main'?[]:st.platforms.filter(p=>p.isCur&&(p.variants||[]).some(v=>routeTokens.some(t=>String(v).includes(t)||t.includes(String(v)))));
      const branchOnly=st.platforms.filter(p=>p.isCur&&p.branchOnly);
      const currentPool=routeSpecific.length?routeSpecific:(route.id!=='main'&&branchOnly.length?branchOnly:st.platforms.filter(p=>p.isCur&&!p.branchOnly));
      const curGroups=consecutiveGroups(currentPool,()=>route.label)
        .sort((a,b)=>b.items.length-a.items.length||a.items[0].pn-b.items[0].pn);
      const current=curGroups[0]?.items||[],wanted=Math.max(1,current.length||Math.min(2,scored.length)||1);
      let active=[...scored].sort((a,b)=>(b.mainScore-a.mainScore)||(b.confidence-a.confidence)).slice(0,Math.min(wanted,scored.length));
      active.sort((a,b)=>a.d-b.d);
      const observed=active.length>0;
      if(!active.length)active=[{d:0,type:'unknown',confidence:0,connected:false},{d:5,type:'unknown',confidence:0,connected:false}];
      const trackDs=active.map(t=>t.d),mainRank=[...active].sort((a,b)=>(b.mainScore-a.mainScore)||(b.confidence-a.confidence));
      const mainTracks=(mainRank.length>1?mainRank.slice(0,2):[mainRank[0],mainRank[0]]).sort((a,b)=>a.d-b.d),mainDs=mainTracks.map(t=>t.d),mainIdx=mainDs.map(d=>trackDs.indexOf(d));
      const sidings=scored.filter(t=>!active.includes(t)&&t.type!=='unknown').map(t=>({d:t.d,connected:t.connected,type:t.type,confidence:t.confidence}));
      const secondary=curGroups.slice(1);
      const variant=consecutiveGroups(st.platforms.filter(p=>p.isCur&&p.branchOnly),p=>p.variants?.join('·')||'가지');
      const other=consecutiveGroups(st.platforms.filter(p=>!p.isCur&&!p.junction&&(p.kind==='metro'||p.kind==='train')),p=>p.kind==='train'?'일반열차 병행선':(p.label||'평행선'));
      const remaining=scored.filter(t=>!active.includes(t)).sort((a,b)=>a.d-b.d);
      const mkGroup=(g,kind,label,color)=>{
        const chosen=remaining.splice(0,Math.min(g.items.length,remaining.length)),ds=chosen.map(t=>t.d),groupObserved=ds.length>0;
        return {key:`${kind}:${escKey(g.key)}`,label,color,kind,items:g.items,count:g.items.length,platformNums:g.items.map(p=>p.pn),
          model:{trackDs:groupObserved?ds:[0,5],mainDs:ds.length>1?[ds[0],ds[ds.length-1]]:groupObserved?[ds[0],ds[0]]:[0,5],blocks:groupObserved?platformBlocks(ds):[],observed:groupObserved}};
      };
      const parallelGroups=[
        ...secondary.map(g=>mkGroup(g,'main','',lineColor)),
        ...variant.map(g=>mkGroup(g,'variant',`${route.label} ${g.key}`,lineColor)),
        ...other.map(g=>mkGroup(g,g.items[0].kind,g.key,g.items[0].color))
      ];
      const signature=[active.length,st.platforms.length,st.junctions,sidings.length,active.map(t=>t.type).join(',')].join('|');
      const confidence=active.reduce((n,t)=>n+t.confidence,0)/Math.max(1,active.length);
      const directBlocks=observed?platformBlocks(trackDs):[];
      if(observed&&confidence>=.65)patterns[signature]={trackCount:active.length,blockPattern:encodeBlockPattern(trackDs,directBlocks),updated:Date.now()};
      const learned=patterns[signature],learnedBlocks=learned&&learned.trackCount===active.length?applyBlockPattern(trackDs,learned.blockPattern):null;
      const blocks=!observed?[]:(learnedBlocks||directBlocks);
      const trackMeta=active.map((t,index)=>({index,d:t.d,type:t.type,confidence:t.confidence,connected:t.connected,observed}));
      st.topology={trackDs,trackMeta,mainDs,mainIdx,blocks,sidings,parallelGroups,cross:observed?Math.min(2,st.junctions):0,pocket:sidings.some(s=>s.type==='turnback'),platforms:current.length,nums:current.map(p=>p.pn),confidence,signature,observed,patternSource:learnedBlocks?'cache':'direct'};
    });
    savePatterns(patterns);
  }
  function semanticRuns(route,graph){
    const rows=route.rn.map((run,ri)=>{
      const ids=graph.runEdges[ri]||[],cs=[...new Set(ids.map(eid=>graph.edges[eid]?.corridor).filter(v=>v!=null))].map(id=>graph.corridors[id]);
      const best=[...cs].sort((a,b)=>(b.confidence-a.confidence)||(b.length-a.length))[0],type=best?.type||'unknown',confidence=best?.confidence||0;
      let minS=Infinity,maxS=-Infinity,minD=Infinity,maxD=-Infinity;for(let i=0;i+1<run.length;i+=2){minS=Math.min(minS,run[i]);maxS=Math.max(maxS,run[i]);minD=Math.min(minD,run[i+1]);maxD=Math.max(maxD,run[i+1]);}
      return {run,runIndex:ri,type,confidence,component:best?.component??null,corridors:cs.map(c=>c.id),minS,maxS,minD,maxD,span:Math.max(0,maxS-minS),visible:false};
    });
    const typeCaps={
      main:4,branch:4,siding:Math.max(2,Math.ceil(route.names.length*.35)),
      refuge:Math.max(2,Math.ceil(route.names.length*.2)),yard:8,turnback:4
    };
    const cap=Math.max(8,Math.min(48,route.names.length)),seen=new Set(),usedByType={},ranked=rows.filter(r=>r.type!=='unknown'&&r.confidence>=.12)
      .sort((a,b)=>(b.confidence-a.confidence)||(b.span-a.span));
    let count=0;for(const r of ranked){
      const key=[r.type,Math.round(r.minS/180),Math.round(r.maxS/180),Math.round((r.minD+r.maxD)/5)].join('|');
      if(seen.has(key)||(usedByType[r.type]||0)>=(typeCaps[r.type]||2))continue;
      seen.add(key);usedByType[r.type]=(usedByType[r.type]||0)+1;r.visible=true;if(++count>=cap)break;
    }
    return rows;
  }
  function analyzeRoute(def,ctx){
    const graph=makeGraph(def),stations=stationTrackCuts(def,graph,ctx.platformResolver);
    addTrafficFeatures(def,graph,stations,ctx.pairUsage,ctx.geo);classifyCorridors(def,graph);buildStationSemantics(def,graph,stations,ctx.line.color);
    return {...def,graph,stations,semanticRuns:semanticRuns(def,graph)};
  }
  function analyzeLine(opts){
    const line=opts.line,track=opts.track,geo=opts.geo||{},schedule=opts.schedule||null;
    const key=[VERSION,line.name,track.rn?.length||0,track.b?.length||0,track.v||0,opts.platformVersion||''].join('|');
    if(MEM.has(key))return MEM.get(key);
    const pairUsage=servicePairUsage(schedule),defs=routeDefs(line,track),routes=defs.map(def=>analyzeRoute(def,{line,geo,pairUsage,platformResolver:opts.platformResolver}));
    const links=[];for(let i=1;i<routes.length;i++)routes[i].names.forEach((name,j)=>{const mi=routes[0].names.indexOf(name);if(mi>=0)links.push({fromRoute:'main',fromStation:mi,toRoute:routes[i].id,toStation:j,name,confidence:1});});
    const graph={
      routes:routes.map(r=>({routeId:r.id,graph:r.graph})),
      componentCount:routes.reduce((n,r)=>n+r.graph.components.length,0),
      corridorCount:routes.reduce((n,r)=>n+r.graph.corridors.length,0),
      links
    };
    const result={version:VERSION,key:hash(key),lineName:line.name,graph,routes,links,createdAt:Date.now()};MEM.set(key,result);return result;
  }
  global.NIMBI_TRACK_SEMANTIC={VERSION,analyzeLine,clearCache(){MEM.clear();},_test:{normalizeStops,makeGraph,classifyCorridors,platformBlocks,encodeBlockPattern,applyBlockPattern,routeDefs}};
})(typeof window!=='undefined'?window:globalThis);
