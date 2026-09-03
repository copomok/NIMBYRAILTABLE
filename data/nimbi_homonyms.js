// 인게임 지리 데이터의 실제 좌표를 기준으로 동명이역을 별도 역으로 분리한다.
// 화면 표기뿐 아니라 검색·경로·시간표·승강장 키가 같은 이름으로 합쳐지지 않도록
// 모든 원천 배열이 로드된 뒤 한 번만 정규화한다.
(() => {
  const oldNames = new Set(['고성','금천','내곡','내덕','덕양','반송','북평','비산','삼산','상도','선암','성내','송정','신동','신정','신천','안정','연희','월곶','일곡','장곡','장성','장수','장안','장흥','춘양','태전','화정','흥덕']);
  const metroNames = {
    '개봉서정선': { 월곶: '월곶(시흥)' },
    'GTX-C': { 송정: '송정(서울)' },
    '삼랑진기장선': { 송정:'송정(부산)' }, '삼랑진기장선 (심야)': { 송정:'송정(부산)' }, '동남선': { 송정:'송정(부산)' }, '동남선 (울주지선)': { 송정:'송정(부산)' },
    '평택안성선': { 안정:'안정(천안)' }, '전남선': { 장성:'장성(호남선)' },
    '김해거제선': { 내덕: '내덕(김해)' },
    '청주선': { 내덕:'내덕(청주)', 흥덕:'흥덕(청주)' },
    '교하선': { 내곡:'내곡(서울)', 덕양:'덕양(고양)' },
    '강서선': { 월곶:'월곶(김포)', 상도:'상도(강서선)' },
    '안양마천선': { 금천:'금천(서울)' }, '안양마천선 (병목안)': { 금천:'금천(서울)' }, '안양마천선/심야': { 금천:'금천(서울)' },
    '창녕부산선': { 금천:'금천(경북)', 덕양:'덕양(경북)', 반송:'반송(부산)' },
    '화성선': { 반송:'반송(화성)' }, '안양동탄선': { 반송:'반송(화성)' },
    '대구밀양선': { 비산:'비산(대구)', 태전:'태전(대구)' }, '대구밀양선/1': { 비산:'비산(대구)', 태전:'태전(대구)' },
    '안산안양선': { 비산:'비산(안산안양선)', 상도:'상도(안산안양선)' }, '안산안양선/1': { 비산:'비산(안산안양선)' }, '안산안양선/2': { 상도:'상도(안산안양선)' },
    '광명성남선': { 비산:'비산(광명성남선)' },
    '울산선': { 삼산:'삼산(울산)' }, '인천종단선': { 월곶:'월곶(시흥)', 삼산:'삼산(인천)', 장곡:'장곡(시흥)' },
    '북울산선': { 선암:'선암(울산)', 신정:'신정(울산)', 신천:'신천(울산)' },
    '호림영천선': { 성내:'성내(대구)' }, '호림영천선 (영천중앙)': { 성내:'성내(대구)' }, '호림영천선 (대구고령)': { 성내:'성내(대구)' }, '수성-범어 셔틀': { 성내:'성내(대구)' },
    '서산선': { 내곡:'내곡(서울)', 성내:'성내(서울)' }, '서산선/1': { 내곡:'내곡(서울)', 성내:'성내(서울)' },
    '춘천선': { 신동:'신동(춘천)' },
    '시흥선': { 신정:'신정(서울)' }, '서부선': { 신정:'신정(서울)' },
    '대구선': { 신천:'신천(대구)' },
    '인천서부선': { 연희:'연희(인천)' }, '인천선': { 연희:'연희(인천)' }, '경의선': { 내곡:'내곡(고양)', 연희:'연희(서울)' },
    '광주1호선': { 일곡:'일곡(광주1호선)' }, '광주2호선': { 일곡:'일곡(광주2호선)' },
    '제2경의선': { 내곡:'내곡(고양)', 장곡:'장곡(서울)', 화정:'화정(고양)' },
    '신노원선': { 장안:'장안(서울)' },
    '광주진목선': { 태전:'태전(경기광주)' },
    '대전서부선': { 화정:'화정(논산)' }, '신강서선': { 송정:'송정(서울)', 덕양:'덕양(고양)', 화정:'화정(고양)' },
    '수원이천선': { 흥덕:'흥덕(용인)' }, '안산용인선': { 흥덕:'흥덕(용인)' }
  };
  const trainName = (name, stops) => {
    if (!oldNames.has(name)) return name;
    const set = new Set(stops.map(stop => stop.s));
    if (name === '장흥') return set.has('송추') || set.has('고양') ? '장흥(교외선)' : '장흥(경전선)';
    if (name === '송정') return '송정(부산)';
    if (name === '춘양') return set.has('봉화') || set.has('소천') || set.has('태백황지') || set.has('구문소') ? '춘양(영동선)' : '춘양(경전선)';
    if (name === '장성') return '장성(호남선)';
    if (name === '고성') return set.has('간성') || set.has('통천읍') ? '고성(강원)' : '고성(경남)';
    if (name === '금천') return set.has('개성') || set.has('평산') ? '금천(황해)' : name;
    if (name === '신동') return set.has('영월') || set.has('사북') ? '신동(태백)' : name;
    if (name === '안정') return set.has('통영') || set.has('고현') ? '안정(통영)' : '안정(천안)';
    if (name === '장안') return set.has('보은') || set.has('속리산') || set.has('화령') ? '장안(보은)' : '장안(서울)';
    if (name === '북평') return set.has('정선') || set.has('평창') ? '북평(정선)' : '북평(동해)';
    if (name === '장수') return '장수(전북)';
    return name;
  };
  const renameObjectKey = (object, before, after) => {
    if (!object || !Object.prototype.hasOwnProperty.call(object, before)) return;
    object[after] = object[before];
    delete object[before];
  };

  if (typeof ALL_TRAINS !== 'undefined') {
    for (const train of ALL_TRAINS) {
      const originalStops = train.stops || [];
      const rename = name => trainName(name, originalStops);
      for (const stop of originalStops) stop.s = rename(stop.s);
      if (Array.isArray(train.boundary)) train.boundary = train.boundary.map(rename);
      train.dest = rename(train.dest);
      if (typeof REAL_PLAT !== 'undefined' && REAL_PLAT[train.no]) {
        for (const oldName of oldNames) renameObjectKey(REAL_PLAT[train.no], oldName, rename(oldName));
      }
    }
  }

  if (typeof METRO_LINES !== 'undefined') {
    for (const line of METRO_LINES) {
      const table = metroNames[line.name] || {};
      const rename = name => table[name] || name;
      if (Array.isArray(line.stations)) line.stations = line.stations.map(rename);
      for (const route of line.routes || []) route.stations = (route.stations || []).map(rename);
    }
  }
  if (typeof METRO_SCHED !== 'undefined') {
    for (const [lineName, schedule] of Object.entries(METRO_SCHED)) {
      const table = metroNames[lineName] || {};
      if (Array.isArray(schedule.s)) schedule.s = schedule.s.map(name => table[name] || name);
    }
  }

  if (typeof STATION_DB !== 'undefined') {
    for (const oldName of oldNames) delete STATION_DB[`${oldName}역`];
    Object.assign(STATION_DB, {
      '고성(강원)역':{lon:128.180812,lat:38.741016,platforms:[],lines:[]}, '고성(경남)역':{lon:128.325721,lat:34.977774,platforms:[],lines:[]},
      '금천(서울)역':{lon:126.904174,lat:37.446153,platforms:[],lines:[]}, '금천(황해)역':{lon:126.472317,lat:38.161278,platforms:[],lines:[]}, '금천(경북)역':{lon:128.898349,lat:35.687869,platforms:[],lines:[]},
      '덕양(고양)역':{lon:126.835027,lat:37.644414,platforms:[],lines:[]}, '덕양(경북)역':{lon:128.609946,lat:35.621492,platforms:[],lines:[]},
      '반송(부산)역':{lon:129.146310,lat:35.226019,platforms:[],lines:[]}, '반송(화성)역':{lon:127.076699,lat:37.196480,platforms:[],lines:[]},
      '북평(정선)역':{lon:128.654465,lat:37.422595,platforms:[],lines:[]}, '북평(동해)역':{lon:129.126530,lat:37.474961,platforms:[],lines:[]},
      '비산(대구)역':{lon:128.570431,lat:35.879460,platforms:[],lines:[]}, '비산(안산안양선)역':{lon:126.949703,lat:37.404975,platforms:[],lines:[]}, '비산(광명성남선)역':{lon:126.939745,lat:37.395595,platforms:[],lines:[]},
      '삼산(인천)역':{lon:126.750178,lat:37.516425,platforms:[],lines:[]}, '삼산(울산)역':{lon:129.339056,lat:35.539601,platforms:[],lines:[]},
      '상도(강서선)역':{lon:126.933044,lat:37.501384,platforms:[],lines:[]}, '상도(안산안양선)역':{lon:126.947714,lat:37.506692,platforms:[],lines:[]},
      '선암(광주)역':{lon:126.778683,lat:35.148300,platforms:[],lines:[]}, '선암(울산)역':{lon:129.308869,lat:35.510940,platforms:[],lines:[]},
      '성내(서울)역':{lon:127.119044,lat:37.527982,platforms:[],lines:[]}, '성내(대구)역':{lon:128.592831,lat:35.865605,platforms:[],lines:[]},
      '신동(태백)역':{lon:128.639945,lat:37.207512,platforms:[],lines:[]}, '신동(춘천)역':{lon:127.699330,lat:37.816730,platforms:[],lines:[]},
      '신정(서울)역':{lon:126.867646,lat:37.513759,platforms:[],lines:[]}, '신정(울산)역':{lon:129.307333,lat:35.546317,platforms:[],lines:[]},
      '신천(대구)역':{lon:128.626722,lat:35.867179,platforms:[],lines:[]}, '신천(울산)역':{lon:129.349220,lat:35.633553,platforms:[],lines:[]},
      '안정(천안)역':{lon:127.043520,lat:36.959152,platforms:[],lines:[]}, '안정(통영)역':{lon:128.407256,lat:34.946825,platforms:[],lines:[]},
      '연희(인천)역':{lon:126.676604,lat:37.547647,platforms:[],lines:[]}, '연희(서울)역':{lon:126.935787,lat:37.575923,platforms:[],lines:[]},
      '일곡(광주1호선)역':{lon:126.894938,lat:35.207896,platforms:[],lines:[]}, '일곡(광주2호선)역':{lon:126.808771,lat:35.166271,platforms:[],lines:[]},
      '장곡(서울)역':{lon:127.046730,lat:37.613799,platforms:[],lines:[]}, '장곡(시흥)역':{lon:126.783916,lat:37.383057,platforms:[],lines:[]},
      '장수(전북)역':{lon:127.513933,lat:35.644954,platforms:[],lines:[]}, '장수(경북)역':{lon:128.571347,lat:36.774974,platforms:[],lines:[]},
      '장안(서울)역':{lon:127.074700,lat:37.579721,platforms:[],lines:[]}, '장안(보은)역':{lon:127.787434,lat:36.466694,platforms:[],lines:[]},
      '태전(대구)역':{lon:128.552890,lat:35.930734,platforms:[],lines:[]}, '태전(경기광주)역':{lon:127.235512,lat:37.388411,platforms:[],lines:[]},
      '화정(논산)역':{lon:127.067641,lat:36.143832,platforms:[],lines:[]}, '화정(고양)역':{lon:126.830610,lat:37.634905,platforms:[],lines:[]},
      '흥덕(용인)역':{lon:127.074003,lat:37.276285,platforms:[],lines:[]}, '흥덕(청주)역':{lon:127.471589,lat:36.642737,platforms:[],lines:[]},
      '장흥(경전선)역': { lon:126.905810, lat:34.690144, platforms:[1,2], lines:['목포-고현 남도해양','목포-부산 ITX새마을','목포-장흥-여수 남도해양','부산-제주 KTX','서울-제주 KTX'] },
      '장흥(교외선)역': { lon:126.941459, lat:37.718617, platforms:[1,2], lines:['교외선 무궁화호 (서울 > 의정부)','교외선 무궁화호 (서울 > 장흥)','의정부-대전 ITX마음'] },
      '송정(서울)역': { lon:126.816482, lat:37.551888, platforms:[3,4], lines:['GTX-C','신강서선'] },
      '송정(부산)역': { lon:129.202498, lat:35.188006, platforms:[1,2,3,4], lines:['남대구-경주-부산 무궁화호','동남선 (울주지선)','목포-부산 무궁화호','삼랑진기장선','삼랑진기장선 (심야)','영주-부산 무궁화호'] },
      '춘양(경전선)역': { lon:126.965626, lat:34.954458, platforms:[1,2], lines:['광주-부산 ITX새마을','목포-여수 ITX새마을','한강로-광주-순천 무궁화호'] },
      '춘양(영동선)역': { lon:128.914909, lat:36.932757, platforms:[1,2,3], lines:['강릉-영주 ITX새마을','영주-태백황지 무궁화','잠실-봉화 SRT','청량리-영주-태백황지 무궁화호','태백황지-남대구 무궁화','태백황지-부산 무궁화'] },
      '장성(호남선)역': { lon:126.789602, lat:35.301984, platforms:[1,2,3,4], lines:['강릉-광주 KTX','서울-광주 ITX새마을','서울-목포 ITX청춘','전남선','전주-목포 무궁화호','한강로-광주-순천 무궁화호'] },
      '장성(포항)역': { lon:129.382010, lat:36.082012, platforms:[], lines:[] },
      '월곶(시흥)역': { lon:126.739395, lat:37.389232, platforms:[1,2,3,4], lines:['개봉서정선','인천종단선'] },
      '월곶(김포)역': { lon:126.551426, lat:37.714442, platforms:[1,2], lines:['강서선'] },
      '내곡(고양)역': { lon:126.804974, lat:37.640439, platforms:[1,2,3,4], lines:['경의선','제2경의선'] },
      '내곡(서울)역': { lon:127.063485, lat:37.455478, platforms:[1,2,3,4], lines:['교하선','서산선','서산선/1'] },
      '내덕(청주)역': { lon:127.488419, lat:36.657427, platforms:[1,2], lines:['청주선'] },
      '내덕(김해)역': { lon:128.813903, lat:35.201258, platforms:[1,2], lines:['김해거제선'] }
    });
  }

  if (typeof PLATFORM_DB !== 'undefined') {
    const splitPlatform = (oldName, definitions) => {
      const source = PLATFORM_DB[`${oldName}역`] || {};
      for (const [newName, acceptedLines] of Object.entries(definitions)) {
        const target = {};
        for (const [platform, detail] of Object.entries(source)) {
          const lines = (detail.l || []).filter(line => acceptedLines.has(line));
          if (lines.length) target[platform] = { g:[...(detail.g || [])], l:lines };
        }
        PLATFORM_DB[`${newName}역`] = target;
      }
      delete PLATFORM_DB[`${oldName}역`];
    };
    splitPlatform('장흥', {
      '장흥(교외선)': new Set(['교외선 무궁화호 (서울 > 의정부)','교외선 무궁화호 (서울 > 장흥)','의정부-대전 ITX마음']),
      '장흥(경전선)': new Set(['목포-고현 남도해양','목포-부산 ITX새마을','목포-장흥-여수 남도해양','부산-제주 KTX','서울-제주 KTX'])
    });
    splitPlatform('송정', {'송정(서울)':new Set(['GTX-C','신강서선']), '송정(부산)':new Set(['남대구-경주-부산 무궁화호','동남선 (울주지선)','목포-부산 무궁화호','삼랑진기장선','삼랑진기장선 (심야)','영주-부산 무궁화호'])});
    splitPlatform('춘양', {'춘양(경전선)':new Set(['광주-부산 ITX새마을','목포-여수 ITX새마을','한강로-광주-순천 무궁화호']), '춘양(영동선)':new Set(['강릉-영주 ITX새마을','영주-태백황지 무궁화','잠실-봉화 SRT','청량리-영주-태백황지 무궁화호','태백황지-남대구 무궁화','태백황지-부산 무궁화'])});
    splitPlatform('장성', {'장성(호남선)':new Set(['강릉-광주 KTX','서울-광주 ITX새마을','서울-광주 ITX새마을/심야','서울-목포 ITX청춘','전남선','전주-목포 무궁화호','한강로-광주-순천 무궁화호','한강로-광주-순천 무궁화호/심야']), '장성(포항)':new Set()});
    splitPlatform('월곶', {'월곶(시흥)':new Set(['개봉서정선','인천종단선']), '월곶(김포)':new Set(['강서선'])});
    splitPlatform('내곡', {'내곡(고양)':new Set(['경의선','제2경의선']), '내곡(서울)':new Set(['교하선','서산선','서산선/1'])});
    splitPlatform('내덕', {'내덕(청주)':new Set(['청주선']), '내덕(김해)':new Set(['김해거제선'])});

    // 나머지 동명이역은 원본 승강장 데이터의 노선명을 분류 키로 사용한다.
    const resolveByLine = (oldName, line) => {
      if (metroNames[line]?.[oldName]) return metroNames[line][oldName];
      if (oldName === '고성') return /원산|경흥|양구/.test(line) ? '고성(강원)' : '고성(경남)';
      if (oldName === '금천' && /신의주/.test(line)) return '금천(황해)';
      if (oldName === '북평') return /정선|S-TRAIN/.test(line) ? '북평(정선)' : '북평(동해)';
      if (oldName === '신동') return '신동(태백)';
      if (oldName === '안정') return /고현|순천|진주/.test(line) ? '안정(통영)' : '안정(천안)';
      if (oldName === '장안') return /문의-상주|대전-영주/.test(line) ? '장안(보은)' : '장안(서울)';
      if (oldName === '장수') return '장수(전북)';
      return null;
    };
    for (const oldName of ['고성','금천','덕양','반송','북평','비산','삼산','상도','선암','성내','신동','신정','신천','안정','연희','일곡','장곡','장수','장안','태전','화정','흥덕']) {
      const source = PLATFORM_DB[`${oldName}역`] || {};
      const definitions = {};
      for (const detail of Object.values(source)) for (const line of detail.l || []) {
        const target = resolveByLine(oldName, line);
        if (target) (definitions[target] ||= new Set()).add(line);
      }
      if (Object.keys(definitions).length) splitPlatform(oldName, definitions);
    }

    // 역 목록의 경유 노선·승강장도 분리된 플랫폼 키에서 다시 계산한다.
    if (typeof STATION_DB !== 'undefined') for (const [stationKey, station] of Object.entries(STATION_DB)) {
      if (!stationKey.includes('(') || !PLATFORM_DB[stationKey]) continue;
      const platformRows = Object.entries(PLATFORM_DB[stationKey]);
      station.platforms = platformRows.map(([platform]) => Number(platform)).filter(Number.isFinite);
      station.lines = [...new Set(platformRows.flatMap(([, detail]) => detail.l || []))];
    }
  }
})();
