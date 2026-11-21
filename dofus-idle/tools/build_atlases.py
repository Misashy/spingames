#!/usr/bin/env python3
"""Construit des atlas WebP haute qualité à partir de TOUS les PNG DOFUS 3.

Les pixels sont lus dans les archives du jeu et placés dans des feuilles
10x10 pour éviter des dizaines de milliers de requêtes/fichiers sur Pages.
Les atlas sont dérivés 1:1 des sprites du client, sans appariement flou.
"""
from collections import defaultdict
import io
import json
import math
import os
from pathlib import Path
import shutil
import sys
import zipfile
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
ASSETS=ROOT/"assets"/"atlases"
RAW=Path("/tmp/dofus-idle-archives")
COLS=10
TILES=100
CONFIG={
 "items":("images-item.zip",128),
 "monsters":("images-monster.zip",224),
 "jobs":("images-job.zip",112)
}
Image.MAX_IMAGE_PIXELS=35_000_000

def main():
    core=json.loads((DATA/"core.json").read_text("utf8"))
    world=json.loads((DATA/"world.json").read_text("utf8"))
    requests={
       "items":{key:val[1] for key,val in core["items"].items() if val[1]>0},
       "monsters":{key:val[3] for key,val in world["monsters"].items() if val[3]>0},
       "jobs":{key:val[1] for key,val in core["jobs"].items() if val[1]>0}
    }
    if ASSETS.exists():shutil.rmtree(ASSETS)
    ASSETS.mkdir(parents=True)
    mapping={x:{} for x in requests}
    summary={}
    for kind,(filename,tile) in CONFIG.items():
        path=RAW/filename
        if not path.exists() or path.stat().st_size<1000:raise RuntimeError("ZIP absent "+str(path))
        print("ASSETS",kind,path.stat().st_size,"octets",flush=True)
        with zipfile.ZipFile(path) as zipfile_:
            names=set(zipfile_.namelist())
            by_icon=defaultdict(list)
            for key,gfx in requests[kind].items():by_icon[int(gfx)].append(str(key))
            valid=[]
            missing=[]
            for gfx in sorted(by_icon):
                entry=next((p for p in (f"2x/{gfx}.png",f"1x/{gfx}.png",f"{gfx}.png") if p in names),None)
                if entry:valid.append((gfx,entry))
                else:missing.append(gfx)
            output_dir=ASSETS/kind
            output_dir.mkdir(parents=True,exist_ok=True)
            sheet=None
            output_count=0
            drawn=0
            skipped=[]
            for gfx,entry in valid:
                try:
                    raw=zipfile_.read(entry)
                    with Image.open(io.BytesIO(raw)) as img:
                        img.load()
                        if img.width>4000 or img.height>4000:raise ValueError("Image gigantesque")
                        image=img.convert("RGBA")
                        image.thumbnail((tile-8,tile-8),Image.Resampling.LANCZOS)
                    if sheet is None:
                        sheet=Image.new("RGBA",(tile*COLS,tile*COLS),(0,0,0,0))
                    slot=drawn%TILES
                    col,row=slot%COLS,slot//COLS
                    sheet.alpha_composite(image,(col*tile+(tile-image.width)//2,row*tile+(tile-image.height)//2))
                    out_path=f"assets/atlases/{kind}/{drawn//TILES:03d}.webp"
                    for key in by_icon[gfx]:mapping[kind][key]=[out_path,slot]
                    drawn+=1
                    if drawn%TILES==0:
                        sheet.save(ROOT/out_path,"WEBP",quality=94,method=4)
                        output_count+=1
                        sheet=None
                except Exception as exc:
                    skipped.append({"gfx":gfx,"reason":str(exc)[:90]})
            if sheet is not None:
                sheet.save(ROOT/f"assets/atlases/{kind}/{drawn//TILES:03d}.webp","WEBP",quality=94,method=4)
                output_count+=1
            summary[kind]={
              "entityCount":len(requests[kind]),
              "withImages":len(mapping[kind]),"uniqueImages":drawn,
              "atlasCount":output_count,"missingGfxCount":len(missing),
              "skippedInvalid":skipped[:50]
            }
            print("RESULTAT",kind,summary[kind],flush=True)
    (DATA/"images.json").write_text(json.dumps(mapping,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    (DATA/"images-manifest.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    total=sum(p.stat().st_size for p in ASSETS.rglob("*.webp"))
    print("ATLAS FINISHED",total//1024//1024,"MB","files",sum(v["atlasCount"] for v in summary.values()),flush=True)
    assert sum(v["atlasCount"] for v in summary.values())>=10
    assert summary["items"]["withImages"]>=17000
    assert summary["monsters"]["withImages"]>=3000
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("ERROR BUILD_ATLASES",repr(e),file=sys.stderr)
        raise
