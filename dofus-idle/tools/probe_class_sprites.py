#!/usr/bin/env python3
import io,json,zipfile,urllib.request,collections
base="https://github.com/ledouxm/dofus-sqlite/releases/download/v6.0_3.7.14.18/"
for name in ("breedsdata.json","characteristicdata.json","classesdata.json"):
 try:
  with urllib.request.urlopen(base+name,timeout=120) as r:raw=r.read()
  data=json.loads(raw)
  print("FILE",name,"length",len(raw),"type",type(data).__name__,flush=True)
  print("SAMPLE",str(data)[:2500],flush=True)
 except Exception as e:print("MISS",name,str(e)[:100],flush=True)
with urllib.request.urlopen(base+"images-class.zip",timeout=180) as r:contents=r.read()
print("ZIP BYTES",len(contents),flush=True)
with zipfile.ZipFile(io.BytesIO(contents)) as z:
 names=z.namelist()
 print("ZIP TOTAL",len(names),"SAMPLE",names[:160],flush=True)
 print("PATH COUNTS",collections.Counter(x.split("/")[0] for x in names).most_common(30),flush=True)
 print("SMALL 300",names[-80:],flush=True)

# Audit déclenché pour validation des visuels de classes.
