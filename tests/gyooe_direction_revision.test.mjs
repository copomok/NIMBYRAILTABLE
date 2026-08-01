import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(`${fs.readFileSync('data/nimbi_rail_data.js','utf8')};this.trains=ALL_TRAINS;`,context);
vm.runInContext(`${fs.readFileSync('data/nimbi_realplat.js','utf8')}`,context);
vm.runInContext(`${fs.readFileSync('data/nimbi_regional_platforms.js','utf8')};this.realPlat=REAL_PLAT;`,context);
const trains=Array.from(context.trains);
const realPlat=context.realPlat;
const gyooe=trains.filter(t=>t.line==='교외선').sort((a,b)=>Number(a.no)-Number(b.no));
const M=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
const span=t=>{
  let base=0,prev=-1;
  return t.stops.map(st=>{
    let a=st.arr?M(st.arr)+base:null, d=st.dep?M(st.dep)+base:null;
    const first=a??d;
    if(prev>=0&&first<prev-60){base+=1440;if(a!==null)a+=1440;if(d!==null)d+=1440;}
    prev=d??a;
    return {s:st.s,arr:a,dep:d,p:st.p??null};
  });
};
const DOWN=['서울','남금호','청량리','의정부','가능','송추','장흥','고양','관산','주교','행신','서울'];
const UP  =['서울','행신','주교','관산','고양','장흥','송추','가능','의정부','청량리','남금호','서울'];

test('교외선은 방향당 14편씩 28편이다',()=>{
  assert.equal(gyooe.length,28);
  assert.equal(gyooe.filter(t=>Number(t.no)%2===1).length,14);
  assert.equal(gyooe.filter(t=>Number(t.no)%2===0).length,14);
  assert.equal(gyooe[0].no,'4401');
  assert.equal(gyooe.at(-1).no,'4428');
});

test('하행(홀수)은 서울→의정부, 상행(짝수)은 서울→행신 방향이다',()=>{
  for(const t of gyooe){
    const odd=Number(t.no)%2===1;
    assert.equal(t.dir, odd?'down':'up', `#${t.no} dir 불일치`);
    assert.deepEqual([...t.stops].map(s=>s.s), odd?DOWN:UP, `#${t.no} 경로 불일치`);
    assert.deepEqual([...t.boundary],['서울','서울']);
  }
});

test('방향별로 정확히 80분 간격이다',()=>{
  for(const parity of [1,0]){
    const list=gyooe.filter(t=>Number(t.no)%2===parity);
    for(let i=1;i<list.length;i++){
      let gap=M(list[i].stops[0].dep)-M(list[i-1].stops[0].dep);
      if(gap<0) gap+=1440;
      assert.equal(gap,80,`#${list[i].no} 간격 ${gap}분`);
    }
  }
});

test('사진 기준 소요시간·승강장이 전 편 동일하다',()=>{
  const plat={서울:['5','6'],남금호:['1','2'],청량리:['17','18'],의정부:['2','1'],
    가능:['1','1'],송추:['2','1'],장흥:['2','1'],고양:['1','2'],관산:['1','1'],주교:['1','1'],행신:['1','2']};
  for(const t of gyooe){
    const odd=Number(t.no)%2===1, st=span(t);
    assert.equal(st.at(-1).arr-st[0].dep, odd?65:61, `#${t.no} 소요시간`);
    for(const s of st) assert.equal(s.p, plat[s.s][odd?0:1], `#${t.no} ${s.s} 승강장`);
    // 하행은 송추에서 5분 교행 정차
    if(odd){ const s=st.find(x=>x.s==='송추'); assert.equal(s.dep-s.arr,5,'송추 교행 정차 5분'); }
  }
});

test('단선(행신~청량리) 구간에서 반대 방향과 정면지장이 없다',()=>{
  const SINGLE=['행신','주교','관산','고양','장흥','송추','가능','의정부','청량리'];
  const segKey=(a,b)=>[a,b].sort().join('|');
  const segs=new Set(SINGLE.slice(0,-1).map((s,i)=>segKey(s,SINGLE[i+1])));
  const occ=[];
  for(const t of gyooe){
    const u=span(t);
    for(let i=0;i<u.length-1;i++){
      const k=segKey(u[i].s,u[i+1].s);
      if(segs.has(k)) occ.push({k,no:t.no,dir:t.dir,a:u[i].dep,b:u[i+1].arr});
    }
  }
  for(let i=0;i<occ.length;i++)for(let j=i+1;j<occ.length;j++){
    const A=occ[i],B=occ[j];
    if(A.k!==B.k||A.dir===B.dir) continue;
    for(const off of [-1440,0,1440])
      assert.ok(!(A.a<B.b+off&&B.a+off<A.b), `${A.k} #${A.no}↔#${B.no} 단선 정면지장`);
  }
});

test('교행 불가역(관산)에서 반대 방향이 동시에 머무르지 않는다',()=>{
  const dwell=[];
  for(const t of gyooe) for(const s of span(t))
    if(s.s==='관산') dwell.push({no:t.no,dir:t.dir,a:s.arr,b:s.dep});
  for(let i=0;i<dwell.length;i++)for(let j=i+1;j<dwell.length;j++){
    const A=dwell[i],B=dwell[j];
    if(A.dir===B.dir) continue;
    for(const off of [-1440,0,1440])
      assert.ok(!(A.a<B.b+off&&B.a+off<A.b),`관산 #${A.no}↔#${B.no} 교행 불가역 동시 재차`);
  }
});

test('편성 2개가 서울 착발로 복귀하고 회차 5분 이상이다',()=>{
  for(const parity of [1,0]){
    const list=gyooe.filter(t=>Number(t.no)%2===parity);
    for(let i=1;i<list.length;i++){
      let gap=M(list[i].stops[0].dep)-M(list[i-1].stops.at(-1).arr);
      if(gap<0) gap+=1440;
      assert.ok(gap>=5,`#${list[i].no} 회차 ${gap}분`);
    }
    assert.equal(list[0].stops[0].s,'서울');
    assert.equal(list.at(-1).stops.at(-1).s,'서울');
    assert.equal(list.length%2,0,'하루 운행 횟수 홀수');
  }
});

test('개정 승강장이 REAL_PLAT에 반영된다',()=>{
  for(const t of gyooe){
    const map=realPlat[t.no];
    assert.ok(map,`#${t.no} REAL_PLAT 없음`);
    for(const st of t.stops) if(st.p) assert.equal(map[st.s],Number(st.p),`#${t.no} ${st.s}`);
  }
});

console.log(`교외선 순환: 28편 · 상하행 재정의 · 단선 교행 검증 완료`);
