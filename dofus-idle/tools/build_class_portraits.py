#!/usr/bin/env python3
"""Extraire uniquement les vrais portraits et icônes DOFUS 3 pour les 19 classes.

Chaque nom est lié au BreedData.id officiel ; aucune approximation par classe.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image
import json
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets"/"classes"
ZIP=Path("/tmp/dofus-images-class.zip")
BREEDS={
    "feca":1,"osamodas":2,"enutrof":3,"sram":4,"xelor":5,"ecaflip":6,
    "eniripsa":7,"iop":8,"cra":9,"sadida":10,"sacrieur":11,
    "pandawa":12,"roublard":13,"zobal":14,"steamer":15,
    "eliotrope":16,"huppermage":17,"ouginak":18,"forgelance":20
}

def write_image(z,zip_path,save_path,limit):
    with Image.open(BytesIO(z.read(zip_path))) as src:
        im=src.convert("RGBA")
        im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
        im.save(save_path,"WEBP",quality=92,method=5)

def main():
    assert ZIP.exists() and ZIP.stat().st_size>1000000
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    portraits={}
    symbols={}
    source={}
    with ZipFile(ZIP) as z:
        entries=set(z.namelist())
        for slug,breed_id in BREEDS.items():
            head=f"heads/big/Head_{breed_id}0.png"
            logo=f"logo_transparent_{breed_id}.png"
            if head not in entries or logo not in entries:
                raise RuntimeError(f"Image officielle absente pour {slug}/{breed_id}: {head}, {logo}")
            portrait=OUT/f"{slug}.webp"
            emblem=OUT/f"emblem-{slug}.webp"
            write_image(z,head,portrait,340)
            write_image(z,logo,emblem,120)
            portraits[slug]=f"assets/classes/{slug}.webp"
            symbols[slug]=f"assets/classes/emblem-{slug}.webp"
            source[slug]={"id":breed_id,"portraitSource":head,"emblemSource":logo,
                          "portraitBytes":portrait.stat().st_size,
                          "emblemBytes":emblem.stat().st_size}
    (OUT/"catalog.json").write_text(json.dumps(portraits,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    (OUT/"emblems.json").write_text(json.dumps(symbols,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    (OUT/"manifest.json").write_text(json.dumps({"source":"ledouxm/dofus-sqlite","version":"v6.0_3.7.14.18",
        "breedCount":len(BREEDS),"sources":source},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("CLASSES VERIFIED",len(portraits),
          "TOTAL MB",round(sum(p.stat().st_size for p in OUT.glob("*.webp"))/1e6,2),flush=True)
    assert len(portraits)==19

if __name__=="__main__":main()
