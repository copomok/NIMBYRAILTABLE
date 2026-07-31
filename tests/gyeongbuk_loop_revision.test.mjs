import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(
  `${fs.readFileSync('data/nimbi_rail_data.js','utf8')};this.trains=ALL_TRAINS;`,
  context
);
const trains=Array.from(context.trains);
const railSrc=fs.readFileSync('js/nimbi_rail.js','utf8');

const CHUNGJU=['1885','1886','1887','1888'];
const LOOP=Array.from({length:8},(_,i)=>String(4451+i));
const NEW=[...CHUNGJU,...LOOP];
const byNo=no=>trains.find(t=>t.no===no);
const toMin=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
// 종착이 자정을 넘는 편성을 위해 단조 증가로 펼침
const span=t=>{
  let base=0,prev=-1;
  return t.stops.map(st=>{
    let a=st.arr?toMin(st.arr)+base:null, d=st.dep?toMin(st.dep)+base:null;
    const first=a??d;
    if(prev>=0&&first<prev-60){base+=1440;if(a!==null)a+=1440;if(d!==null)d+=1440;}
    prev=d??a;
    return {s:st.s,arr:a,dep:d,p:st.p??null};
  });
};

test('신설 12편이 모두 등재되고 열차번호가 겹치지 않는다',()=>{
  for(const no of NEW) assert.ok(byNo(no),`#${no} 누락`);
  assert.equal(new Set(trains.map(t=>t.no)).size,trains.length,'열차번호 중복');
  for(const no of NEW) assert.equal(byNo(no).grade,'ITX-마음');
});

test('하행은 홀수·상행은 짝수 번호를 쓴다',()=>{
  for(const no of NEW){
    const t=byNo(no);
    assert.equal(t.dir, Number(no)%2===1?'down':'up', `#${no} 방향/번호 불일치`);
  }
});

test('충주–남대구 계통은 왕복 2회이며 경유 노선이 기재된다',()=>{
  for(const no of ['1885','1887']){
    const t=byNo(no);
    assert.deepEqual([...t.boundary],['충주','남대구']);
    assert.equal(t.line,'중부내륙선·경부선');
    assert.equal(t.stops.at(0).s,'충주');
    assert.equal(t.stops.at(-1).s,'남대구');
  }
  for(const no of ['1886','1888']){
    const t=byNo(no);
    assert.deepEqual([...t.boundary],['남대구','충주']);
    assert.equal(t.line,'경부선·중부내륙선');
    assert.equal(t.stops.at(0).s,'남대구');
    assert.equal(t.stops.at(-1).s,'충주');
  }
});

test('경북순환은 남대구 착발 폐순환이고 4개 노선을 경유한다',()=>{
  for(const no of LOOP){
    const t=byNo(no);
    assert.deepEqual([...t.boundary],['남대구','남대구']);
    assert.equal(t.stops.at(0).s,'남대구');
    assert.equal(t.stops.at(-1).s,'남대구');
    assert.equal(t.line, Number(no)%2===1
      ? '중앙선·경북선·중부내륙선·경부선'
      : '경부선·중부내륙선·경북선·중앙선');
    const names=t.stops.map(s=>s.s);
    for(const s of ['경산','하양','의성','안동','장수','예천','용궁','남문경','상주','김천','구미'])
      assert.ok(names.includes(s),`#${no} ${s} 누락`);
  }
});

test('통과역은 통과 시각만 갖고 승강장을 적지 않는다',()=>{
  for(const no of NEW){
    const t=byNo(no);
    t.stops.forEach((st,i)=>{
      const terminal=i===0||i===t.stops.length-1;
      if(terminal) return assert.ok(st.p,`#${no} ${st.s} 시종착 승강장 누락`);
      if(st.dep===null){ assert.ok(st.arr,`#${no} ${st.s} 통과 시각 없음`);
        assert.equal(st.p,undefined,`#${no} ${st.s} 통과역에 승강장 기재`); }
      else assert.ok(st.p,`#${no} ${st.s} 정차역 승강장 누락`);
    });
  }
});

test('통과·추월 금지역을 지나지 않는다',()=>{
  const noPass=new Set(['사천','함안','추풍령','불국사','입실','함평','평창']);
  for(const no of NEW)
    for(const st of byNo(no).stops)
      assert.ok(!(st.dep===null&&st.arr&&noPass.has(st.s)),`#${no} ${st.s} 통과금지역 통과`);
});

test('각 편성의 시각이 단조 증가한다',()=>{
  for(const no of NEW){
    const st=span(byNo(no));
    let prev=-1;
    for(const x of st){
      if(x.arr!==null){ assert.ok(x.arr>=prev,`#${no} ${x.s} 도착 역행`); prev=x.arr; }
      if(x.dep!==null){ assert.ok(x.dep>=prev,`#${no} ${x.s} 출발 역행`); prev=x.dep; }
    }
  }
});

test('확정 운용표 2편성이 착발역 복귀·회차 5분 이상을 만족한다',()=>{
  const sets=[
    ['1887','4451','4453','4455','4457','1886'],
    ['1885','4452','4454','4456','4458','1888']
  ];
  for(const seq of sets){
    assert.ok(railSrc.includes(`seq:["${seq.join('","')}"]`),'CONFIRMED_ROTATION 등재 누락');
    let prev=null;
    for(const no of seq){
      const st=span(byNo(no));
      if(prev){
        assert.equal(prev.s,st[0].s,`#${no} 접속역 불일치`);
        let gap=st[0].dep-prev.arr;
        if(gap<0) gap+=1440;
        assert.ok(gap>=5,`#${no} 회차 ${gap}분 (5분 미만)`);
      }
      prev={s:st.at(-1).s,arr:st.at(-1).arr%1440};
    }
    const first=byNo(seq[0]).stops[0].s;
    assert.equal(prev.s,first,'출발역과 최종 도착역 불일치');
  }
});

test('신설 편성끼리 같은 역·같은 승강장을 동시에 쓰지 않는다',()=>{
  const occ=new Map();
  for(const no of NEW)
    for(const st of span(byNo(no))){
      if(!st.p) continue;
      const k=`${st.s} ${st.p}`;
      if(!occ.has(k)) occ.set(k,[]);
      occ.get(k).push({no,a:st.arr??st.dep,d:st.dep??st.arr});
    }
  for(const [k,list] of occ)
    for(let i=0;i<list.length;i++)
      for(let j=i+1;j<list.length;j++)
        for(const off of [-1440,0,1440]){
          const a=list[i], b=list[j];
          assert.ok(!(a.a<b.d+off&&b.a+off<a.d),`${k} #${a.no}↔#${b.no} 승강장 중복 점유`);
        }
});

test('편성당 하루 운행 횟수가 짝수다',()=>{
  for(const seq of [['1887','4451','4453','4455','4457','1886'],['1885','4452','4454','4456','4458','1888']])
    assert.equal(seq.length%2,0,'운행 횟수 홀수');
});

console.log(`경북순환/충주 ITX-마음: ${NEW.length}편 · 확정 운용 2편성 검증 완료`);
