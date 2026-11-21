#!/usr/bin/env python3
import sqlite3, json, os
db=sqlite3.connect(os.environ.get('DOFUS_SQLITE','/tmp/dofus.sqlite'))
db.row_factory=sqlite3.Row
names=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
print("TOTAL TABLES",len(names),flush=True)
wanted=('job','item','recipe','monster','drop','skill','subarea','area','interact','resource','world','map','translation')
for name in names:
 if not any(x in name.lower() for x in wanted):continue
 cols=[x[1]+' '+x[2] for x in db.execute(f'PRAGMA table_info("{name}")')]
 try:n=db.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
 except: n='?'
 print('TABLE',name,'ROWS',n,'COLS',','.join(cols)[:1100],flush=True)
 if any(x in name.lower() for x in ('recipe','job','drop','skill','monster','subarea','interact','item')):
  for row in db.execute(f'SELECT * FROM "{name}" LIMIT 2'):
   out=dict(row)
   print('EXAMPLE',name,json.dumps(out,ensure_ascii=False,default=str)[:1800],flush=True)

print("--- SPECIALIZED LOOKUPS ---",flush=True)
def dumpquery(label,query,params=(),limit=24):
 print("QUERY",label,flush=True)
 try:
  for row in db.execute(query,params).fetchmany(limit):
   values=dict(row)
   for k,v in list(values.items()):
    if isinstance(v,str) and len(v)>2600:values[k]=v[:2600]+"...(truncated)"
   print(json.dumps(values,ensure_ascii=False,default=str),flush=True)
 except Exception as e: print("ERROR",label,str(e),flush=True)
dumpquery("JOBS", """SELECT j.id,j.iconId,t.value AS name FROM JobData j
 LEFT JOIN translations t ON t.id=j.nameId AND t.lang='fr' ORDER BY j.id""",limit=50)
dumpquery("GATHERS", """SELECT s.id,s.parentJobId,s.levelMin,s.gatheredRessourceItem,s.clientDisplay,t.value AS name FROM SkillData s LEFT JOIN translations t ON t.id=s.nameId AND t.lang='fr'
 WHERE s.gatheredRessourceItem>0 ORDER BY s.parentJobId,s.levelMin""",limit=120)
dumpquery("RECIPES", """SELECT r.id,r.resultId,r.resultLevel,r.jobId,r.skillId,r.quantities,t.value AS name
 FROM RecipeData r JOIN ItemData i ON i.id=r.resultId
 JOIN translations t ON t.id=i.nameId AND t.lang='fr'
 ORDER BY r.resultLevel LIMIT 25""",limit=25)
dumpquery("RECIPE_INGREDIENTS", """SELECT rowid,RecipeData_id,target_id FROM RecipeData_ingredientIds_junction LIMIT 20""")
dumpquery("MONSTER", """SELECT id,nameId,gfxId,grades,drops,globalDrops,subareas FROM MonsterData WHERE id=979""",limit=1)
dumpquery("MONSTER_2", """SELECT id,nameId,gfxId,grades,drops,globalDrops,subareas FROM MonsterData WHERE id=31""",limit=1)
dumpquery("SUBAREAS", """SELECT s.id,s.areaId,s.level,t.value name,s.monsters
 FROM SubAreaData s LEFT JOIN translations t ON t.id=s.nameId AND t.lang='fr'
 WHERE json_array_length(s.monsters)>0 ORDER BY s.level LIMIT 20""",limit=20)
dumpquery("ITEM_TYPES", """SELECT typ.id,typ.categoryId,typ.superTypeId,t.value name FROM ItemTypeData typ
 LEFT JOIN translations t ON t.id=typ.nameId AND t.lang='fr' ORDER BY typ.id""",limit=110)
