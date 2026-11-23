#!/usr/bin/env python3
"""Construire une base d'effets EXACTS d'équipement DOFUS 3, sans inventer les jets.

Les références d'effets de dofus.sqlite sont aplaties, donc on extrait les
EffectInstanceDice à partir des objets référencés dans itemsdata/itemsetsdata.
Les caractéristiques affichées sont celles du client de la version épinglée.
"""
from pathlib import Path
import json,sqlite3,os,sys,re,collections
BASE=Path("/tmp/dofus-v7")
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"equipment-v7.json"
def read(name):return json.loads((BASE/name).read_text("utf8"))
def as_array(value):
 if isinstance(value,list):return value
 if isinstance(value,dict):return value.get("Array",[])
 return []
def mapping(doc):
 return {int(row["rid"]):row.get("data",{}) for row in doc["references"]["RefIds"] if row.get("rid")}
def table_rows(doc,refs):
 keys=as_array(doc["objectsById"]["m_keys"])
 vals=as_array(doc["objectsById"]["m_values"])
 assert len(keys)==len(vals)
 for k,ref in zip(keys,vals):
  obj=refs.get(int(ref.get("rid") or 0))
  if isinstance(obj,dict):yield str(k),obj
def parse_effects(refs,values):
 out=[]
 for row in as_array(values):
  obj=refs.get(int(row.get("rid") or 0))
  if not isinstance(obj,dict):continue
  eid=int(obj.get("actionId") or 0)
  if not eid:continue
  lo=int(obj.get("diceNum") or obj.get("value") or 0)
  hi=int(obj.get("diceSide") or lo)
  if hi==0:hi=lo
  if hi<lo and hi!=0:hi=lo
  if abs(lo)>100000 or abs(hi)>100000:continue
  out.append([eid,lo,hi])
 return out
def clean_label(s):
 s=str(s or "")
 s=re.sub(r'\{\{[^{}]*\}\}',"",s)
 s=re.sub(r'#\d+',"",s).replace("~","").strip(" -+%")
 return " ".join(s.split())[:100]
def main():
 db=sqlite3.connect("file:"+str(BASE/"dofus.sqlite")+"?mode=ro",uri=True)
 db.row_factory=sqlite3.Row
 tr={int(r["id"]):r["value"] for r in db.execute("SELECT id,value FROM translations WHERE lang='fr'")}
 effectdefs={}
 for row in db.execute("SELECT id,descriptionId,characteristic,characteristicOperator,bonusType FROM EffectData"):
  eid=int(row["id"])
  label=clean_label(tr.get(int(row["descriptionId"] or 0),""))
  if not label:label="Effet DOFUS "+str(eid)
  effectdefs[str(eid)]=[label,int(row["characteristic"] or 0),str(row["characteristicOperator"] or "")]
 itemdoc=read("itemsdata.json");setdoc=read("itemsetsdata.json")
 itemrefs=mapping(itemdoc);setrefs=mapping(setdoc)
 items={}
 setIds=set()
 for iid,row in table_rows(itemdoc,itemrefs):
  sid=int(row.get("itemSetId") or -1)
  effects=parse_effects(itemrefs,row.get("possibleEffects"))
  if effects or sid>=0:
   items[iid]=[sid,effects]
  if sid>=0:setIds.add(sid)
 sets={}
 for sid,obj in table_rows(setdoc,setrefs):
  members=[int(x) for x in as_array(obj.get("items")) if int(x)>0]
  tiers=[]
  for tier in as_array(obj.get("effects")):
   tiers.append(parse_effects(setrefs,tier.get("values")))
  # position 0 = 1 pièce, position 1 = 2 pièces, etc.
  if not members or not tiers:continue
  name=tr.get(int(obj.get("nameId") or 0),"Panoplie "+sid)
  sets[sid]=[name,members,tiers]
 # Source integrity checks, refuses corrupt/misaligned pointers.
 assert len(items)>4500,(len(items),"items")
 assert len(sets)>500,(len(sets),"sets")
 assert items.get("2411",[None])[0]==1,items.get("2411")
 assert any(x[0]==118 and x[1]==16 and x[2]==20 for x in items["2411"][1]),items["2411"]
 assert len(sets["1"][2])>=5
 missing=sum(1 for sid in setIds if str(sid) not in sets)
 if missing:print("SET_ID_WITHOUT_DEFINITION",missing,flush=True)
 used=set(x[0] for v in items.values() for x in v[1])
 used.update(x[0] for row in sets.values() for tier in row[2] for x in tier)
 effects={str(i):effectdefs.get(str(i),["Effet DOFUS "+str(i),0,""]) for i in sorted(used)}
 result={"meta":{"source":"ledouxm/dofus-sqlite","release":"v6.0_3.7.14.18",
  "sourceFiles":["itemsdata.json","itemsetsdata.json","dofus.sqlite"],
  "itemCount":len(items),"setCount":len(sets),"effectTypes":len(effects),
  "note":"Les jets sont les bornes DOFUS; le moteur idle applique leur valeur médiane déterministe, sans prétendre qu'il s'agit d'un jet individuel."},
  "items":items,"sets":sets,"effects":effects}
 OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
 print("EQUIPMENT BUILT",result["meta"],"bytes",OUT.stat().st_size,flush=True)
 for iid in ["2411","2414","44","2603"]:
  print("ITEM",iid,items.get(iid),flush=True)
 print("SET 1",sets["1"][0],sets["1"][1],sets["1"][2][:3],flush=True)
 print("EFFECT SAMPLE",{k:effects.get(k) for k in ["118","125","111","128","138","115","174"]},flush=True)
if __name__=="__main__":main()

# Données client épinglées : validation du référentiel V7.
