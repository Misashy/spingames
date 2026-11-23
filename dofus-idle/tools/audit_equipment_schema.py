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

# Schéma version DOFUS 3.7.14.18 : audit des effets actifs.

for filename, data in [("ITEM",item),("SET",sets),("EFFECT",effects),("CHAR",char)]:
 v=data.get("objectsById")
 print("OBJECTS_BY_ID",filename,type(v).__name__,"len",len(v),"first-keys",list(v)[:6],flush=True)
 vals=list(v.values()) if isinstance(v,dict) else v
 for o in vals[:3]:
  print("OBJ SAMPLE",filename,json.dumps(o,ensure_ascii=False)[:6500],flush=True)
 ids={"ITEM":[1,31,236,885,1000,1067,24538,17862,2603],"SET":[1,2,3,4,16,55],"EFFECT":[111,118,119,123,124,125,126,128,138,176,158],"CHAR":[1,10,11,12,13,14,15,16,17,18]}[filename]
 for n in ids:
  x=v.get(str(n)) if isinstance(v,dict) else next((o for o in v if isinstance(o,dict) and int(o.get("id") or 0)==n),None)
  print("OBJ LOOKUP",filename,n,json.dumps(x,ensure_ascii=False)[:6000],flush=True)

import sqlite3
db=sqlite3.connect("file:/tmp/dofus-v7/dofus.sqlite?mode=ro",uri=True)
db.row_factory=sqlite3.Row
tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print("RELEVANT TABLES", [x for x in tables if any(k in x.lower() for k in ("item","effect","characteristic","set","bonus"))][:120],flush=True)
for table in [x for x in tables if x in ("ItemData","ItemSetData","EffectData","EffectInstanceData","WeaponData") or "Effect" in x and "junction" not in x][:22]:
 cols=[r[1] for r in db.execute(f"PRAGMA table_info({table})")]
 print("SQL TABLE",table,"COLUMNS",cols,flush=True)
 for rec in db.execute(f"SELECT * FROM {table} LIMIT 2"):
  print("SQL SAMPLE",table,json.dumps(dict(rec),ensure_ascii=False,default=str)[:5000],flush=True)
