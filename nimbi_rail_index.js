// 자주 쓰는 시간표 조회를 위한 읽기 전용 런타임 인덱스.
// ALL_TRAINS 원본은 그대로 유지하고, 반복적인 전체 배열 순회만 줄인다.
const TRAIN_BY_NO = new Map();
const TRAINS_BY_NO = new Map();
const TRAINS_BY_STATION = new Map();

for (const train of ALL_TRAINS) {
  if (!TRAIN_BY_NO.has(train.no)) TRAIN_BY_NO.set(train.no, train);
  let sameNumber = TRAINS_BY_NO.get(train.no);
  if (!sameNumber) {
    sameNumber = [];
    TRAINS_BY_NO.set(train.no, sameNumber);
  }
  sameNumber.push(train);

  const seenStations = new Set();
  for (const stop of train.stops) {
    if (seenStations.has(stop.s)) continue;
    seenStations.add(stop.s);
    let trains = TRAINS_BY_STATION.get(stop.s);
    if (!trains) {
      trains = [];
      TRAINS_BY_STATION.set(stop.s, trains);
    }
    trains.push(train);
  }
}

function getTrainByNo(no) {
  return TRAIN_BY_NO.get(no);
}

function getTrainsByNo(no) {
  const trains = TRAINS_BY_NO.get(no);
  return trains ? trains.slice() : [];
}

function getTrainsByStation(station) {
  return TRAINS_BY_STATION.get(station) || [];
}
