#!/usr/bin/env python3
"""Importe les PNG DOFUS 3, sans associer une mauvaise image à un ancien nom wiki."""
import io
import difflib
import json
import pathlib
import re
import sys
import urllib.request
import zipfile

RELEASE_TAG = "v6.0_3.7.13.17"
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "monsters"
IDS = [98,52,61,159,48,79,59,104,134,149,36,147,103,47,102,173,55,56,57,58,96,64,65,180]
INCARNAM_NAMES = [
    "Blue Lilpiwi", "Chafer Novice", "Chafer Pikeman", "Chafer Scout",
    "Chafer Sergeant", "Daredevil Crab", "Fearful Moskito", "Green Lilpiwi",
    "Immature Blue Larva", "Immature Green Larva", "Immature Orange Larva",
    "Incarnam Scarecrow", "Kardorim", "Lupus Minimus", "Pink Lilpiwi",
    "Pliplop", "Prepubescent Chafer", "Purple Lilpiwi", "Purrsnikit",
    "Red Lilpiwi", "Small Gobball War Chief", "Tigrimas", "Vulnerable Mush Mush",
    "Yellow Lilpiwi", "Young Arachnee", "Young Boar"
]

# Noms de l'ancien wiki absents du client DOFUS 3 : image de même famille.
# Il ne s'agit PAS du sprite original exact de ces variantes.
FAMILY_ALIASES = {
    "Blue Lilpiwi":"Blue Piwi",
    "Daredevil Crab":"Crab",
    "Fearful Moskito":"Moskito",
    "Green Lilpiwi":"Green Piwi",
    "Immature Blue Larva":"Blue Larva",
    "Immature Green Larva":"Green Larva",
    "Immature Orange Larva":"Orange Larva",
    "Incarnam Scarecrow":"Training Scarecrow",
    "Pink Lilpiwi":"Pink Piwi",
    "Prepubescent Chafer":"Chafer Novice",
    "Purple Lilpiwi":"Purple Piwi",
    "Red Lilpiwi":"Red Piwi",
    "Small Gobball War Chief":"Gobball War Chief",
    "Vulnerable Mush Mush":"Mush Mush",
    "Yellow Lilpiwi":"Yellow Piwi",
    "Young Arachnee":"Tiny Arachnee",
    "Young Boar":"Boar",
}

def get(url):
    req = urllib.request.Request(
        url, headers={"User-Agent": "DofusClickerAssetImporter/1.0",
                      "Accept": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()

def records_in(data):
    """Ne retourne que les objets monstres contenant id, gfxId ET nameId."""
    found = []
    def walk(value):
        if isinstance(value, dict):
            if all(k in value for k in ("id", "gfxId", "nameId")):
                found.append((value["id"],value["gfxId"],value["nameId"]))
                return
            for v in value.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(value, list):
            for v in value:
                if isinstance(v, (dict, list)):
                    walk(v)
    walk(data)
    return found

def slug(text):
    return re.sub(r"[^a-z0-9]+","-",text.lower()).strip("-")

def main():
    base = f"https://github.com/ledouxm/dofus-sqlite/releases/download/{RELEASE_TAG}"
    print("Release:", RELEASE_TAG, flush=True)
    print("Téléchargement de la base de monstres...", flush=True)
    monsters = json.loads(get(base + "/monstersdata.json"))
    records = records_in(monsters)
    del monsters
    print("Monstres indexés:", len(records), flush=True)
    english = json.loads(get(base + "/i18n_en.json"))
    by_id = {}
    by_name = {}
    for mid, gfx, name_id in records:
        try:
            mid = int(mid)
            gfx = int(gfx)
        except (TypeError, ValueError):
            continue
        by_id[mid] = gfx
        name = english.get(str(name_id))
        if isinstance(name,str) and name.strip():
            by_name.setdefault(name.casefold().strip(), []).append((mid,gfx,name))
    del english
    print("Monstres avec nom anglais:",len(by_name), flush=True)

    print("Téléchargement des PNG...",flush=True)
    archive = zipfile.ZipFile(io.BytesIO(get(base + "/images-monster.zip")))
    paths = set(archive.namelist())
    OUT.mkdir(parents=True, exist_ok=True)
    imported = {}
    unresolved = []
    approximated = []

    def copy_image(key, gfx, mid=None, label=None):
        # Prioriser gfxId, jamais un autre id si celui-ci existe.
        candidates = [f"2x/{gfx}.png",f"1x/{gfx}.png"] if gfx is not None else []
        # Réserve historique : certains monstersdata n'ont pas de gfxId.
        if gfx is None and mid is not None:
            candidates += [f"2x/{mid}.png",f"1x/{mid}.png"]
        path = next((p for p in candidates if p in paths),None)
        if not path: return False
        content = archive.read(path)
        if not content.startswith(b"\x89PNG\r\n\x1a\n"): return False
        (OUT/f"{key}.png").write_bytes(content)
        imported[str(key)] = {"monsterId":mid,"gfxId":gfx,"source":path,"bytes":len(content)}
        if label: imported[str(key)]["name"]=label
        return True

    for mid in IDS:
        if not copy_image(str(mid),by_id.get(mid),mid):
            print("WARNING: ancien sprite manquant:",mid,flush=True)

    for name in INCARNAM_NAMES:
        key = "incarnam-" + slug(name)
        alias = FAMILY_ALIASES.get(name)
        official = alias if alias else name
        options = by_name.get(official.casefold().strip(), [])
        if len(options)==1:
            mid,gfx,official_name=options[0]
            if copy_image(key,gfx,mid,name):
                if alias:
                    imported[key]["substitute"] = alias
                    imported[key]["exact"] = False
                    approximated.append(name)
                    print("FAMILY ART", name,"=>",alias,mid,flush=True)
                else:
                    imported[key]["exact"] = True
                    print("EXACT",name,"=>",mid,"gfx",gfx,flush=True)
                continue
        unresolved.append(name)
        normalized=name.casefold().replace("lilpiwi","piwi").replace("immature","young").replace("vulnerable","fragile")
        approximate=difflib.get_close_matches(normalized, list(by_name), n=8, cutoff=.4)
        tokens=[t for t in re.findall(r"[a-z]{3,}",normalized) if t not in ("young","blue","red","green","pink","purple","yellow")]
        keyword=[k for k in by_name if any(t in k for t in tokens)][:12]
        print("MISSING",name,"suggestions",approximate,"keyword",keyword,flush=True)

    manifest={
        "release":RELEASE_TAG,
        "source":"ledouxm/dofus-sqlite",
        "total":len(IDS)+len(INCARNAM_NAMES),
        "incarnamRequested":len(INCARNAM_NAMES),
        "incarnamResolved":len(INCARNAM_NAMES)-len(unresolved),
        "incarnamExact":len(INCARNAM_NAMES)-len(unresolved)-len(approximated),
        "incarnamFamilySprites":len(approximated),
        "approximateIncarnam":approximated,
        "unresolvedIncarnam":unresolved,
        "imported":imported
    }
    (ROOT/"assets"/"manifest.json").write_text(
        json.dumps(manifest,indent=2,ensure_ascii=False)+"\n", encoding="utf-8")
    print("IMPORT DONE",len(imported),"images, Incarnam",
          manifest["incarnamResolved"],"/",len(INCARNAM_NAMES),flush=True)
    # Doit rester fonctionnel même si les sprites d'une version ancienne
    # n'existent plus dans la version moderne de DOFUS.
    if len(imported)<len(IDS):
        raise RuntimeError("Les sprites des zones existantes sont incomplets")

if __name__=="__main__":
    try: main()
    except Exception as exc:
        print("IMPORT FAILED:",str(exc),file=sys.stderr)
        raise
