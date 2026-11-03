#!/usr/bin/env python3
"""Analyze one save-file line entity without changing or guessing track links."""
from __future__ import annotations
import argparse,hashlib,heapq,json,math,struct,subprocess,tempfile
from pathlib import Path
from extract_nimbyrails5_map import encode_varuint,entity_ids,lon_lat,parse_stations,parse_track_points,varuint

def find_section(data:bytes,count:int,kind:int):
 marker=encode_varuint(count);position=0
 while True:
  position=data.find(marker,position)
  if position<0:raise ValueError(f'entity section not found: count={count}, kind={kind}')
  try:
   ids,end=entity_ids(data,position)
   if len(ids)==count and ids and all(entity_id>>49==kind for entity_id in ids):return ids,end,position
  except (ValueError,IndexError):pass
  position+=1

def distance(points,a,b):
 return math.hypot(points[b]['x']-points[a]['x'],points[b]['y']-points[a]['y'])/1000

def shortest(points,adjacency,starts,ends):
 costs={};previous={};queue=[];end_set=set(ends)
 for entity_id in starts:costs[entity_id]=0;heapq.heappush(queue,(0,entity_id))
 target=None
 while queue:
  cost,current=heapq.heappop(queue)
  if cost!=costs[current]:continue
  if current in end_set:target=current;break
  for following in adjacency[current]:
   value=cost+distance(points,current,following)
   if value<costs.get(following,math.inf):costs[following]=value;previous[following]=current;heapq.heappush(queue,(value,following))
 if target is None:return None
 path=[target]
 while path[-1] not in starts:path.append(previous[path[-1]])
 path.reverse();return costs[target],path

def main():
 parser=argparse.ArgumentParser();parser.add_argument('save',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
 source=args.save.read_bytes();track_count,aux_count,station_count,train_count,line_count=struct.unpack_from('<IIIII',source,0x24);zstd_offset=source.find(b'\x28\xb5\x2f\xfd')
 with tempfile.NamedTemporaryFile() as frame:
  frame.write(source[zstd_offset:]);frame.flush();payload=subprocess.check_output(['zstd','-q','-d','-c',frame.name])
 points,track_end=parse_track_points(payload,track_count);stations=parse_stations(payload,track_end,station_count);station_by_id={int(item['id']):item for item in stations};station_ids=set(station_by_id);track_ids=set(points)
 line_ids,line_list_end,line_section=find_section(payload,line_count,4);record_count,cursor=varuint(payload,line_list_end)
 if record_count!=line_count:raise ValueError('line record count mismatch')
 starts=[]
 for entity_id in line_ids:
  position=payload.find(encode_varuint(entity_id),cursor)
  if position<0:raise ValueError(f'line record missing: {entity_id}')
  starts.append(position);cursor=position+len(encode_varuint(entity_id))
 starts.append(min(len(payload),starts[-1]+65536));lines=[];all_line_track_ids=set()
 for index,entity_id in enumerate(line_ids):
  start,end=starts[index],starts[index+1]
  try:
   position=start;_,position=varuint(payload,position);order,position=varuint(payload,position);_,position=varuint(payload,position);child_count,position=varuint(payload,position);children=[]
   for _ in range(child_count):child,position=varuint(payload,position);children.append(str(child))
   _,position=varuint(payload,position);_,position=varuint(payload,position);length,position=varuint(payload,position);name=payload[position:position+length].decode('utf-8');position+=length;length,position=varuint(payload,position);code=payload[position:position+length].decode('utf-8')
  except (ValueError,IndexError,UnicodeDecodeError):continue
  events=[]
  for offset in range(start,end):
   try:value,next_offset=varuint(payload,offset)
   except (ValueError,IndexError):continue
   if next_offset>end:continue
   if value in station_ids:events.append(('station',value))
   elif value in track_ids:events.append(('track',value));all_line_track_ids.add(value)
  route=[];seen=set();anchors=[]
  for kind,value in events:
   if kind=='track':
    if value not in anchors:anchors.append(value)
    continue
   if value in seen:break
   seen.add(value);station=station_by_id[value];route.append({'stationId':str(value),'name':station['name'],'approachTrackIds':[str(item) for item in anchors[-2:]]});anchors=[]
  lines.append({'entityId':str(entity_id),'order':order,'name':name,'code':code,'childLineIds':children,'route':route})
 selected=next(item for item in lines if item['name']=='서울-대전 무궁화호' and item['code']=='L-10900400')
 adjacency={entity_id:set() for entity_id in points}
 for entity_id,point in points.items():
  for other in point['refs']:
   if other in points and other!=entity_id:adjacency[entity_id].add(other);adjacency[other].add(entity_id)
 def evaluate(before,after):
  starts_ids=[int(item) for item in before['approachTrackIds'] if int(item) in points];ends_ids=[int(item) for item in after['approachTrackIds'] if int(item) in points];match=shortest(points,adjacency,starts_ids,ends_ids) if starts_ids and ends_ids else None
  row={'fromStationId':before['stationId'],'from':before['name'],'toStationId':after['stationId'],'to':after['name'],'startTrackIds':before['approachTrackIds'],'endTrackIds':after['approachTrackIds'],'status':'unavailable'}
  if match:
   length,path=match;direct=distance(points,path[0],path[-1]);branches=sum(len(adjacency[item])!=2 for item in path[1:-1]);depot='차량기지' in before['name'] or '차량기지' in after['name'];row.update({'status':'depot-connector' if depot else 'verified','detailLevel':'mainline-representative','lengthKm':round(length,6),'directDistanceKm':round(direct,6),'lengthRatio':round(length/direct,6),'branchNodeCount':branches,'trackPointIds':[str(item) for item in path],'geometry':[[round(lon_lat(points[item]['x'],points[item]['y'])[0],6),round(lon_lat(points[item]['x'],points[item]['y'])[1],6)] for item in path]})
  return row
 candidates=[evaluate(before,after) for before,after in zip(selected['route'],selected['route'][1:])]
 focus_pairs={frozenset(pair) for pair in [('남안양','수원'),('수원','오산'),('오산','평택'),('남금호','서울'),('서울','청량리'),('남금호','청량리')]};route_variants=[]
 for line in lines:
  for before,after in zip(line['route'],line['route'][1:]):
   if frozenset((before['name'],after['name'])) not in focus_pairs:continue
   route_variants.append({'lineEntityId':line['entityId'],'lineName':line['name'],'lineCode':line['code'],'pair':evaluate(before,after)})
 component_by_point={};components=[]
 for entity_id in points:
  if entity_id in component_by_point:continue
  stack=[entity_id];members=[];component_id=len(components);component_by_point[entity_id]=component_id
  while stack:
   current=stack.pop();members.append(current)
   for following in adjacency[current]:
    if following not in component_by_point:component_by_point[following]=component_id;stack.append(following)
  components.append(members)
 referenced_components={component_by_point[item] for item in all_line_track_ids if item in component_by_point};unreferenced=[members for index,members in enumerate(components) if index not in referenced_components]
 topology={'componentCount':len(components),'lineReferencedTrackPointCount':len(all_line_track_ids),'lineReferencedComponentCount':len(referenced_components),'includedTrackPointCount':sum(len(components[index]) for index in referenced_components),'unreferencedComponentCount':len(unreferenced),'unreferencedTrackPointCount':sum(map(len,unreferenced)),'largestUnreferencedComponentPointCounts':sorted((len(item) for item in unreferenced),reverse=True)[:20],'policy':{'connectedDeadEnd':'include','explicitMerge':'include','connectedWithoutService':'include','fullyIsolatedWithoutLineReference':'exclude-after-parser-validation','stationTrackDetail':'collapse-to-mainline-representative'}}
 result={'source':{'saveName':args.save.name,'sha256':hashlib.sha256(source).hexdigest(),'format':'nimbyrails5','declaredTrackCount':track_count,'parsedTrackPointCount':len(points),'declaredStationCount':station_count,'parsedStationCount':len(stations),'declaredTrainCount':train_count,'declaredLineCount':line_count,'parsedLineCount':len(lines),'lineSectionOffset':line_section},'topologyClassification':topology,'line':selected,'candidates':candidates,'routeVariants':route_variants,'depotConnectorCandidate':next(item for item in candidates if item['from']=='신탄진' and item['to']=='회덕역 / 대전차량기지')}
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'line':selected['name'],'stops':len(selected['route']),'verified':sum(item['status']=='verified' for item in candidates),'depotConnector':sum(item['status']=='depot-connector' for item in candidates),'unavailable':sum(item['status']=='unavailable' for item in candidates),'topologyClassification':topology,'routeVariants':[{**item,'pair':item['pair']|{'geometry':'omitted','trackPointIds':'omitted'}} for item in route_variants]},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
