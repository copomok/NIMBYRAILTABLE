#!/usr/bin/env python3
"""Extract map geometry from a NIMBY Rails 5 save without modifying the save.

The game save is a small NMBY header followed by a Zstandard frame. The
decompressed payload stores entity IDs as unsigned LEB128 values. Entity type 1
contains track graph points and entity type 2 contains station records.
"""
from __future__ import annotations
import argparse,hashlib,json,math,struct,subprocess,tempfile
from pathlib import Path

WEB_MERCATOR_RADIUS=6378137.0
KOREA_BOUNDS=(123.0,32.0,132.0,44.0)

def varuint(data:bytes,offset:int):
 value=shift=0
 while True:
  byte=data[offset];offset+=1;value|=(byte&0x7f)<<shift
  if byte<0x80:return value,offset
  shift+=7
  if shift>63:raise ValueError('invalid varuint')

def encode_varuint(value:int):
 out=bytearray()
 while value>=128:out.append((value&127)|128);value>>=7
 out.append(value);return bytes(out)

def lon_lat(x:float,y:float):
 return x/WEB_MERCATOR_RADIUS*180/math.pi,(2*math.atan(math.exp(y/WEB_MERCATOR_RADIUS))-math.pi/2)*180/math.pi

def entity_ids(data:bytes,offset:int):
 count,offset=varuint(data,offset);values=[]
 for _ in range(count):value,offset=varuint(data,offset);values.append(value)
 return values,offset

def parse_track_points(data:bytes,expected:int):
 ids,offset=entity_ids(data,0)
 if len(ids)!=expected:raise ValueError(f'track count mismatch: {len(ids)} != {expected}')
 record_count,cursor=varuint(data,offset)
 if record_count!=expected:raise ValueError('track record count mismatch')
 points={}
 for entity_id in ids:
  encoded=encode_varuint(entity_id);position=cursor;limit=min(len(data),cursor+10_000);found=None
  while True:
   position=data.find(encoded,position,limit)
   if position<0:break
   index=position+len(encoded)
   try:
    if data[index]!=0:raise ValueError
    ref_count,index=varuint(data,index+1)
    if ref_count>12:raise ValueError
    index+=2;refs=[]
    for _ in range(ref_count):ref,index=varuint(data,index);refs.append(ref)
    if data[index:index+5]!=b'\0'*5:raise ValueError
    x,y=struct.unpack_from('<dd',data,index+5)
    if not(math.isfinite(x) and math.isfinite(y) and abs(x)<=20_050_000 and abs(y)<=20_050_000):raise ValueError
    found=(position,refs,x,y);break
   except (ValueError,IndexError,struct.error):position+=1
  if found:
   position,refs,x,y=found;points[entity_id]={'refs':refs,'x':x,'y':y};cursor=position+len(encoded)
 return points,cursor

def parse_stations(data:bytes,start:int,expected:int):
 marker=encode_varuint(expected);section=data.find(marker,start)
 while section>=0:
  try:
   ids,offset=entity_ids(data,section)
   if len(ids)==expected and ids and ids[0]//(1<<49)==2:break
  except (ValueError,IndexError):pass
  section=data.find(marker,section+1)
 else:raise ValueError('station section not found')
 record_count,cursor=varuint(data,offset)
 if record_count!=expected:raise ValueError('station record count mismatch')
 stations=[]
 for entity_id in ids:
  encoded=encode_varuint(entity_id);position=cursor;limit=min(len(data),cursor+200_000);found=None
  while True:
   position=data.find(encoded,position,limit)
   if position<0:break
   index=position+len(encoded)
   try:
    _,index=varuint(data,index);index+=1
    x,y=struct.unpack_from('<dd',data,index);index+=16
    length,index=varuint(data,index)
    if length<1 or length>500:raise ValueError
    name=data[index:index+length].decode('utf-8')
    if any(ord(char)<32 for char in name):raise ValueError
    lon,lat=lon_lat(x,y)
    if not(KOREA_BOUNDS[0]<=lon<=KOREA_BOUNDS[2] and KOREA_BOUNDS[1]<=lat<=KOREA_BOUNDS[3]):raise ValueError
    found=(position,name,lon,lat);break
   except (ValueError,UnicodeDecodeError,IndexError,struct.error):position+=1
  if found:
   position,name,lon,lat=found;stations.append({'id':str(entity_id),'name':name.removesuffix('역'),'lon':round(lon,7),'lat':round(lat,7)});cursor=position+len(encoded)
 return stations

def simplify(sequence,points,tolerance):
 if len(sequence)<=2:return sequence
 first,last=points[sequence[0]],points[sequence[-1]];dx=last['x']-first['x'];dy=last['y']-first['y'];denominator=dx*dx+dy*dy
 distance=-1;split=0
 for index,entity_id in enumerate(sequence[1:-1],1):
  point=points[entity_id]
  if denominator:
   ratio=max(0,min(1,((point['x']-first['x'])*dx+(point['y']-first['y'])*dy)/denominator));px=first['x']+ratio*dx;py=first['y']+ratio*dy
  else:px=first['x'];py=first['y']
  current=(point['x']-px)**2+(point['y']-py)**2
  if current>distance:distance=current;split=index
 if distance<=tolerance*tolerance:return [sequence[0],sequence[-1]]
 left=simplify(sequence[:split+1],points,tolerance);right=simplify(sequence[split:],points,tolerance);return left[:-1]+right

def track_paths(points,tolerance):
 valid={}
 for entity_id,point in points.items():
  lon,lat=lon_lat(point['x'],point['y'])
  if KOREA_BOUNDS[0]<=lon<=KOREA_BOUNDS[2] and KOREA_BOUNDS[1]<=lat<=KOREA_BOUNDS[3]:valid[entity_id]=point
 adjacency={entity_id:set() for entity_id in valid}
 for entity_id,point in valid.items():
  for other in point['refs']:
   if other in valid and other!=entity_id:adjacency[entity_id].add(other);adjacency[other].add(entity_id)
 visited=set();paths=[]
 def walk(start,next_id):
  result=[start];previous=None;current=start
  while True:
   choices=[item for item in adjacency[current] if item!=previous and tuple(sorted((current,item))) not in visited]
   if not choices:break
   following=next_id if next_id is not None else choices[0];next_id=None;visited.add(tuple(sorted((current,following))));previous,current=current,following;result.append(current)
  return result
 for entity_id in valid:
  if len(adjacency[entity_id])!=2:
   for other in adjacency[entity_id]:
    if tuple(sorted((entity_id,other))) not in visited:paths.append(walk(entity_id,other))
 for entity_id in valid:
  for other in adjacency[entity_id]:
   if tuple(sorted((entity_id,other))) not in visited:paths.append(walk(entity_id,other))
 result=[]
 for path in paths:
  if len(path)<2:continue
  reduced=simplify(path,valid,tolerance);result.append([[round(lon_lat(valid[item]['x'],valid[item]['y'])[0],6),round(lon_lat(valid[item]['x'],valid[item]['y'])[1],6)] for item in reduced])
 return result,len(valid),len(visited)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('save',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--tolerance',type=float,default=5.0);args=parser.parse_args()
 source=args.save.read_bytes()
 if source[:4]!=b'NMBY':raise SystemExit('not a NIMBY Rails save')
 track_count,aux_count,station_count,train_count,line_count=struct.unpack_from('<IIIII',source,0x24)
 zstd_offset=source.find(b'\x28\xb5\x2f\xfd')
 if zstd_offset<0:raise SystemExit('zstd frame not found')
 with tempfile.NamedTemporaryFile() as frame:
  frame.write(source[zstd_offset:]);frame.flush();payload=subprocess.check_output(['zstd','-q','-d','-c',frame.name])
 points,end=parse_track_points(payload,track_count);stations=parse_stations(payload,end,station_count);tracks,geometry_points,edge_count=track_paths(points,args.tolerance)
 company=source[0x58:0x100].split(b'\0',1)[0].decode('utf-8','replace')
 result={'source':{'saveName':args.save.name,'company':company,'sha256':hashlib.sha256(source).hexdigest(),'format':'nimbyrails5','exactTrackGeometry':True,'declaredTrackCount':track_count,'parsedTrackPointCount':len(points),'geometryPointCount':geometry_points,'edgeCount':edge_count,'declaredStationCount':station_count,'parsedStationCount':len(stations),'declaredTrainCount':train_count,'declaredLineCount':line_count,'auxiliaryCount':aux_count,'simplifyToleranceMeters':args.tolerance},'tracks':tracks,'stations':stations}
 args.output.parent.mkdir(parents=True,exist_ok=True);payload_json=json.dumps(result,ensure_ascii=False,separators=(',',':'))
 args.output.write_text('// Generated by tools/extract_nimbyrails5_map.py; do not edit by hand.\n'+'globalThis.NIMBI_LATEST_MAP=Object.freeze('+payload_json+');\n')
 print(json.dumps(result['source'],ensure_ascii=False,indent=2));print(f'paths: {len(tracks)}, output: {args.output} ({args.output.stat().st_size} bytes)')

if __name__=='__main__':main()
