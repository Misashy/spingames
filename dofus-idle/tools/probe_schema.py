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
