import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../data/nimbi_rail_data.js',import.meta.url),'utf8'),context);
vm.runInContext('globalThis.__trains=ALL_TRAINS',context);
const trains=context.__trains;
const byNo=new Map(trains.map(train=>[train.no,train]));
const targets=trains.filter(train=>Number(train.no)>=1221&&Number(train.no)<=1236);
const minute=value=>{
  const [hour,min]=value.split(':').map(Number);
  return hour*60+min;
};
const firstTime=train=>train.stops.find(stop=>stop.dep||stop.arr)?.dep||
  train.stops.find(stop=>stop.dep||stop.arr)?.arr;
const lastTime=train=>[...train.stops].reverse().find(stop=>stop.arr||stop.dep)?.arr||
  [...train.stops].reverse().find(stop=>stop.arr||stop.dep)?.dep;
const elapsed=(from,to)=>{
  let value=minute(to)-minute(from);
  if(value<0)value+=1440;
  return value;
};
const stationMinute=(train,station)=>{
  const stop=train.stops.find(item=>item.s===station);
  return stop?minute(stop.arr||stop.dep):null;
};

test('강릉–영주 새마을은 기존 구간시각·정차 패턴을 유지한다',()=>{
  assert.equal(targets.length,16);
  const downNames='강릉,동강릉,옥계,동해,북평,삼척,미로,고사리,도계,태백황지,황지,구문소,석포,승부,소천,춘양,법전,봉화,영주';
  for(const train of targets){
    assert.equal(elapsed(firstTime(train),lastTime(train)),87,`#${train.no} 소요시간`);
    const names=train.stops.map(stop=>stop.s).join(',');
    assert.equal(names,train.dir==='down'?downNames:downNames.split(',').reverse().join(','));
    assert.equal(train.stops.filter(stop=>stop.arr&&stop.dep).length,7,`#${train.no} 중간 정차`);
  }
  assert.equal(firstTime(byNo.get('1221')),'5:43');
  assert.equal(firstTime(byNo.get('1222')),'5:29');
  assert.equal(lastTime(byNo.get('1235')),'22:00');
  assert.equal(lastTime(byNo.get('1236')),'23:49');
});

test('강릉–영주 새마을 3편성은 5분 이상 회차하고 기점으로 복귀한다',()=>{
  const rotations=[
    ['1221','1224','1227','1230','1233','1234'],
    ['1223','1226','1229','1232','1235','1236'],
    ['1222','1225','1228','1231']
  ];
  const assigned=new Set;
  for(const sequence of rotations){
    const services=sequence.map(no=>byNo.get(no));
    assert.equal(services[0].stops[0].s,services.at(-1).stops.at(-1).s,sequence.join(','));
    for(let index=1;index<services.length;index++){
      const previous=services[index-1],current=services[index];
      assert.equal(previous.stops.at(-1).s,current.stops[0].s,`${previous.no}→${current.no}`);
      assert.ok(elapsed(lastTime(previous),firstTime(current))>=5,`${previous.no}→${current.no} 회차`);
    }
    sequence.forEach(no=>assigned.add(no));
  }
  assert.equal(assigned.size,16);
});

test('영동선 공유구간은 3분 시격을 확보하고 열차 순서가 뒤집히지 않는다',()=>{
  const yeongdong=new Set(['태백황지','황지','구문소','석포','승부','소천','춘양','법전','봉화','영주']);
  for(const target of targets){
    const targetStations=target.stops.filter(stop=>yeongdong.has(stop.s)).map(stop=>stop.s);
    for(const rival of trains){
      if(rival===target||Number(rival.no)>=1221&&Number(rival.no)<=1236)continue;
      const common=targetStations.filter(station=>rival.stops.some(stop=>stop.s===station));
      if(common.length<2)continue;
      const rivalIndices=common.map(station=>rival.stops.findIndex(stop=>stop.s===station));
      if(!rivalIndices.every((value,index)=>index===0||value>rivalIndices[index-1]))continue;
      const differences=common.map(station=>{
        const targetTime=stationMinute(target,station);
        let rivalTime=stationMinute(rival,station);
        while(rivalTime-targetTime>720)rivalTime-=1440;
        while(targetTime-rivalTime>720)rivalTime+=1440;
        const difference=targetTime-rivalTime;
        assert.ok(Math.abs(difference)>=3,`#${target.no}/#${rival.no} ${station} ${difference}분`);
        return difference;
      });
      for(let index=1;index<differences.length;index++){
        assert.equal(Math.sign(differences[index]),Math.sign(differences[index-1]),
          `#${target.no}/#${rival.no} 영동선 무단 추월`);
      }
    }
  }
});

test('태백선 추월은 역 정차 시각이 정확히 일치할 때만 허용한다',()=>{
  const taebaek=new Set(['강릉','동강릉','옥계','동해','북평','삼척','미로','고사리','도계','태백황지']);
  for(const target of targets){
    const targetStations=target.stops.filter(stop=>taebaek.has(stop.s)).map(stop=>stop.s);
    for(const rival of trains){
      if(rival===target||Number(rival.no)>=1221&&Number(rival.no)<=1236)continue;
      const common=targetStations.filter(station=>rival.stops.some(stop=>stop.s===station));
      if(common.length<2)continue;
      const rivalIndices=common.map(station=>rival.stops.findIndex(stop=>stop.s===station));
      if(!rivalIndices.every((value,index)=>index===0||value>rivalIndices[index-1]))continue;
      const differences=common.map(station=>{
        const targetTime=stationMinute(target,station);
        let rivalTime=stationMinute(rival,station);
        while(rivalTime-targetTime>720)rivalTime-=1440;
        while(targetTime-rivalTime>720)rivalTime+=1440;
        return {station,difference:targetTime-rivalTime};
      });
      for(let index=1;index<differences.length;index++){
        if(Math.sign(differences[index].difference)===Math.sign(differences[index-1].difference))continue;
        const crossing=differences[index];
        const targetStop=target.stops.find(stop=>stop.s===crossing.station);
        const rivalStop=rival.stops.find(stop=>stop.s===crossing.station);
        assert.ok(targetStop.arr&&!targetStop.dep&&rivalStop.arr&&rivalStop.dep,
          `#${target.no}/#${rival.no} ${crossing.station} 추월 시설`);
        assert.equal(targetStop.arr,rivalStop.arr,`#${target.no}/#${rival.no} ${crossing.station} 추월 시각`);
      }
    }
  }
});
