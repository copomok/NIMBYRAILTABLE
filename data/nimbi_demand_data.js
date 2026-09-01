var NIMBI_DEMAND_VERSION='od-v1.5.0';
var NIMBI_DAY_MULTIPLIERS=[1.07,1.03,.94,.95,.99,1.12,1.10];
var NIMBI_STATION_DEMAND_PROFILE={
'서울':{origin:1.7,destination:1.65,business:1.5,transfer:1.45,capital:true},
'한강로':{origin:1.55,destination:1.5,business:1.45,transfer:1.35,capital:true},
'청량리':{origin:1.3,destination:1.28,business:1.3,transfer:1.3,capital:true},
'남대구':{origin:1.5,destination:1.48,business:1.25,transfer:1.3},
'부산':{origin:1.55,destination:1.7,business:1.25,leisure:1.55,transfer:1.15},
'대전':{origin:1.2,destination:1.2,business:1.05,transfer:1.35},
'수원':{origin:1.35,destination:1.28,business:1.35,transfer:1.25,capital:true},
'천안':{origin:1.22,destination:1.16,business:1.18,transfer:1.2},
'전주':{origin:1.18,destination:1.24,leisure:1.35},
'강릉':{origin:1.05,destination:1.35,leisure:1.6},
'해운대':{origin:1,destination:1.38,leisure:1.7},
'경주':{origin:.95,destination:1.35,leisure:1.65}
};
var NIMBI_BOOKING_CURVES={
business:[[720,.08],[336,.24],[168,.46],[72,.72],[24,.91],[3,.96],[0,.98]],
leisure:[[720,.16],[336,.42],[168,.68],[72,.84],[24,.94],[3,.975],[0,.99]],
regional:[[720,.04],[336,.13],[168,.31],[72,.58],[24,.86],[3,.93],[0,.96]]
};
