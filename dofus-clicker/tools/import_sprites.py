#!/usr/bin/env python3
"""Importe les pictogrammes monstres DOFUS 3 en PNG, par MonsterData.gfxId."""
import io
import json
import os
import pathlib
import sys
import urllib.request
import zipfile

RELEASE_TAG = "v6.0_3.7.13.17"
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "monsters"
IDS = [98,52,61,159,48,79,59,104,134,149,36,147,103,47,102,173,55,56,57,58,96,64,65,180]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "DofusClickerAssetImporter/1.0", "Accept": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()

def find_gfx_map(data):
    result = {}
    def walk(value):
        if isinstance(value, dict):
            if "id" in value and ("gfxId" in value or "gfx_id" in value):
                try:
                    result[int(value["id"])] = int(value.get("gfxId", value.get("gfx_id")))
                except (ValueError, TypeError):
                    pass
            for v in value.values():
                if isinstance(v, (list, dict)):
                    walk(v)
        elif isinstance(value, list):
            for v in value: walk(v)
    walk(data)
    return result

def main():
    base=f"https://github.com/ledouxm/dofus-sqlite/releases/download/{RELEASE_TAG}"
    assets={name:f"{base}/{name}" for name in ("images-monster.zip","monstersdata.json")}
    for name in ("images-monster.zip","monstersdata.json"):
        if name not in assets: raise RuntimeError("Fichier absent de la release: "+name)
    print("Release stable:",RELEASE_TAG,flush=True)
    print("Téléchargement des données monstres...",flush=True)
    data=json.loads(get(assets["monstersdata.json"]))
    print("DEBUG data type", type(data).__name__, flush=True)
    print("DEBUG data keys/sample:", json.dumps((list(data.items())[:1] if isinstance(data,dict) else data[:1]),ensure_ascii=False,default=str)[:4500], flush=True)
    mapping=find_gfx_map(data)
    del data
    locale=json.loads(get(f"{base}/i18n_en.json"))
    print("DEBUG locale type", type(locale).__name__, flush=True)
    print("DEBUG locale keys/sample", json.dumps((list(locale.items())[:2] if isinstance(locale,dict) else locale[:2]),ensure_ascii=False,default=str)[:3500],flush=True)
    del locale
    print("Correspondances MonsterData:",len(mapping),flush=True)
    print("Téléchargement des images...",flush=True)
    blob=get(assets["images-monster.zip"])
    archive=zipfile.ZipFile(io.BytesIO(blob))
    names=set(archive.namelist())
    OUT.mkdir(parents=True,exist_ok=True)
    imported={}
    for monster_id in IDS:
        gfx=mapping.get(monster_id)
        candidates=[f"2x/{gfx}.png",f"1x/{gfx}.png"] if gfx else []
        candidates += [f"2x/{monster_id}.png",f"1x/{monster_id}.png"]
        path=next((p for p in candidates if p in names),None)
        if not path:
            print(f"WARNING missing sprite for monster {monster_id} (gfx={gfx})")
            continue
        raw=archive.read(path)
        if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            print(f"WARNING invalid PNG {path}");continue
        (OUT/f"{monster_id}.png").write_bytes(raw)
        imported[str(monster_id)]={"gfxId":gfx,"source":path,"bytes":len(raw)}
        print(f"{monster_id} -> {path} ({len(raw)} octets)")
    if len(imported)<len(IDS)//2:
        raise RuntimeError(f"Seulement {len(imported)}/{len(IDS)} PNG trouvés; importer à vérifier")
    manifest={"release":RELEASE_TAG,"source":"ledouxm/dofus-sqlite", "total":len(IDS),"imported":imported}
    (ROOT/"assets"/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("Import terminé:",len(imported),"/",len(IDS),flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("IMPORT FAILED:",exc,file=sys.stderr)
        raise
