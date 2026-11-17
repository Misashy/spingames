#!/usr/bin/env python3
"""Import DOFUS 3 : les PNG sont associés aux vrais MonsterData.id + gfxId + nom FR."""
import io
import json
import pathlib
import sys
import urllib.request
import zipfile

RELEASE_TAG = "v6.0_3.7.13.17"
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "monsters"
BASE = f"https://github.com/ledouxm/dofus-sqlite/releases/download/{RELEASE_TAG}"

# Conserver les images déjà utilisées dans les cinq autres zones.
OTHER_ZONES_IDS = [98,52,61,159,48,79,59,104,134,149,36,147,103,47,102,173,55,56,57,58,96,64,65,180]
# Monstres distincts du bestiaire des captures : 6 territoires + la Crypte.
# Les cinq Chafers sont combattus deux fois (Cimetière, puis Crypte).
INCARNAM_TERRITORIES = {
    "Champs": [979,980,970,981],
    "Route des âmes": [3271,3273,3272,3270],
    "Pâturages": [973,972,984,971],
    "Forêt": [982,4105,4106],
    "Lac": [4110,4109,4108],
    "Cimetière": [4046,4048,4047,4049,4050],
    "Crypte de Kardorim": [4046,4048,4047,4049,4050,4051],
}
ALL_IDS = sorted(set(OTHER_ZONES_IDS).union(*(set(ids) for ids in INCARNAM_TERRITORIES.values())))
INCAR_IDS = sorted(set(x for ids in INCARNAM_TERRITORIES.values() for x in ids))

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":"DofusClicker/2.0","Accept":"application/octet-stream"})
    with urllib.request.urlopen(req,timeout=200) as response:
        return response.read()

def records_in(value):
    """Cherche les MonsterData à travers l'enveloppe JSON Unity."""
    if isinstance(value,dict):
        if all(key in value for key in ("id","gfxId","nameId")):
            yield (value["id"],value["gfxId"],value["nameId"])
        else:
            for item in value.values():
                if isinstance(item,(dict,list)):
                    yield from records_in(item)
    elif isinstance(value,list):
        for item in value:
            if isinstance(item,(dict,list)):
                yield from records_in(item)

def main():
    print("DOFUS data release:",RELEASE_TAG,flush=True)
    source=json.loads(download(BASE+"/monstersdata.json"))
    records=list(records_in(source))
    del source
    french=json.loads(download(BASE+"/i18n_fr.json"))
    by_id={}
    for monster_id,gfx_id,name_id in records:
        try:
            mid,gfx=int(monster_id),int(gfx_id)
        except (TypeError,ValueError):
            continue
        name=french.get(str(name_id))
        if isinstance(name,str) and name.strip():
            by_id[mid]={"id":mid,"gfxId":gfx,"name":name.strip()}
    print("Base française:",len(by_id),"monstres",flush=True)
    database=[by_id[mid] for mid in sorted(by_id)]
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"database.fr.json").write_text(
        json.dumps({"source":"ledouxm/dofus-sqlite","release":RELEASE_TAG,
                    "count":len(database),"monsters":database},
                   ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"
    )

    archive=zipfile.ZipFile(io.BytesIO(download(BASE+"/images-monster.zip")))
    names=set(archive.namelist())
    imported={}
    missing=[]
    for mid in ALL_IDS:
        entry=by_id.get(mid)
        if not entry:
            missing.append(f"{mid}: pas de MonsterData français")
            continue
        gfx=entry["gfxId"]
        path=next((path for path in (f"2x/{gfx}.png",f"1x/{gfx}.png") if path in names),None)
        if not path:
            missing.append(f"{mid} / gfxId {gfx}: PNG absent")
            continue
        content=archive.read(path)
        if not content.startswith(b"\x89PNG\r\n\x1a\n"):
            missing.append(f"{mid}: PNG invalide")
            continue
        (OUT/f"{mid}.png").write_bytes(content)
        imported[str(mid)]={"monsterId":mid,"gfxId":gfx,"name":entry["name"],
                            "officialNameFr":entry["name"],"source":path,
                            "exact":True,"bytes":len(content)}
    if missing:
        raise RuntimeError("Sprites manquants : "+"; ".join(missing))
    catalog={key:{"name":item["officialNameFr"],"monsterId":item["monsterId"],"exactHistorical":True}
             for key,item in imported.items()}
    (OUT/"catalog.fr.js").write_text(
        "window.DOFUS_CATALOG_FR = "+json.dumps(catalog,ensure_ascii=False,sort_keys=True)+";\n",
        encoding="utf-8"
    )
    manifest={"release":RELEASE_TAG,"source":"ledouxm/dofus-sqlite",
              "total":len(ALL_IDS),"incarnamRequested":len(INCAR_IDS),
              "incarnamResolved":len(INCAR_IDS),"incarnamExact":len(INCAR_IDS),
              "incarnamFamilySprites":0,"unresolvedIncarnam":[],
              "incarnamTerritories":INCARNAM_TERRITORIES,"imported":imported}
    (ROOT/"assets"/"manifest.json").write_text(
        json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    print("IMPORT SUCCESS:",len(imported),"PNG exacts ;",
          len(INCAR_IDS),"monstres distincts d'Incarnam ;",
          len(INCARNAM_TERRITORIES),"territoires",flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("IMPORT FAILED:",str(exc),file=sys.stderr)
        raise
