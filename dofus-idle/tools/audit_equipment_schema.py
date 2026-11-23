#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path("/tmp/dofus-v7")
def sample(n):
 p=ROOT/n
 data=json.loads(p.read_text(encoding="utf8"))
 print("FILE",n,"container",type(data).__name__,"count",len(data),flush=True)
 if isinstance(data,dict):
  print("DICT KEYS",list(data)[:25],flush=True)
  vals=list(data.values())[:2]
 else:vals=data[:3]
 for o in vals:
  print("SAMPLE",n,json.dumps(o,ensure_ascii=False)[:5000],flush=True)
 return data
item=sample("itemsdata.json")
sets=sample("itemsetsdata.json")
effects=sample("effectsdata.json")
char=sample("characteristicsdata.json")
def sample_lookup(data,ids):
 if isinstance(data,dict):
  xs=list(data.values())
 else:xs=data
 for q in ids:
  out=next((x for x in xs if isinstance(x,dict) and int(x.get("id",0) or 0)==q),None)
  print("LOOKUP",q,json.dumps(out,ensure_ascii=False)[:4000],flush=True)
sample_lookup(item,[1,31,236,885,1000,1067,24538])
sample_lookup(sets,[1,2,3,4,16,55])
sample_lookup(effects,[111,118,119,123,124,125,126,128,138,176,158])
sample_lookup(char,[1,10,11,12,13,14,15,16,17,18])
