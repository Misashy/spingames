#!/usr/bin/env python3
"""Construit le catalogue jouable complet DOFUS 3 sans inventer les recettes ou les zones.

Source : SQLite de ledouxm/dofus-sqlite. Chaque recette porte ses quantités et
ses identifiants d'ingrédients EXACTS; chaque monstre garde ses taux de base
INCONDITIONNELS (grades 1), les conditions de quête / modificateurs non simulés
étant exclus. Les statistiques de combat restent une adaptation idle.
"""
from __future__ import annotations
from collections import defaultdict
import json
import os
from pathlib import Path
import sqlite3
import sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"
DB=Path(os.environ.get("DOFUS_SQLITE","/tmp/dofus.sqlite"))
RELEASE=os.environ.get("DOFUS_RELEASE_TAG","v6.0_3.7.14.18")

def as_json(raw,default):
    try: return json.loads(raw) if raw else default
    except (ValueError,TypeError):return default

def jwrite(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")

def main():
    db=sqlite3.connect(f"file:{DB}?mode=ro",uri=True)
    db.row_factory=sqlite3.Row
    tr={int(r["id"]):r["value"] for r in db.execute("SELECT id,value FROM translations WHERE lang='fr'")}
    def trans(i, fallback=""):
        return tr.get(int(i or 0)) or fallback

    item_types={}
    for r in db.execute("SELECT id,nameId,categoryId,superTypeId FROM ItemTypeData"):
        item_types[str(r["id"])]=[trans(r["nameId"]),r["categoryId"],r["superTypeId"]]

    items={}
    for table in ("ItemData","WeaponData"):
        columns={r[1] for r in db.execute(f"PRAGMA table_info({table})")}
        selected=[key for key in ("id","nameId","iconId","typeId","level","price") if key in columns]
        if len(selected)<5: raise RuntimeError("Item schema changed: "+table)
        for r in db.execute(f"SELECT {','.join(selected)} FROM {table}"):
            if int(r["id"])<0:continue
            name=trans(r["nameId"])
            if not name:continue
            items[str(r["id"])]=[name,int(r["iconId"] or 0),max(1,int(r["level"] or 1)),
                                 int(r["typeId"] or 0),int(r["price"] or 0)]
    jobs={}
    for r in db.execute("SELECT id,nameId,iconId FROM JobData"):
        name=trans(r["nameId"])
        if not name:continue
        jid=int(r["id"])
        if jid==1: continue  # "Base" est un conteneur de recettes, pas un métier jouable
        jobs[str(jid)]=[name,int(r["iconId"] or 0)]

    valid_jobs={int(x) for x in jobs}
    gather=defaultdict(list)
    for r in db.execute("""SELECT id,parentJobId,levelMin,gatheredRessourceItem,clientDisplay
                           FROM SkillData WHERE gatheredRessourceItem>0 AND clientDisplay=1
                           ORDER BY parentJobId,levelMin,id"""):
        jid=int(r["parentJobId"])
        iid=int(r["gatheredRessourceItem"])
        if jid in valid_jobs and str(iid) in items:
            entry=[iid,max(1,int(r["levelMin"] or 1)),int(r["id"])]
            if entry[0] not in {x[0] for x in gather[str(jid)]}:
                gather[str(jid)].append(entry)

    ingredients=defaultdict(list)
    for r in db.execute("SELECT RecipeData_id,target_id FROM RecipeData_ingredientIds_junction ORDER BY rowid"):
        ingredients[str(r["RecipeData_id"])].append(int(r["target_id"]))
    recipes=defaultdict(list)
    ignored_recipes=0
    for r in db.execute("SELECT id,resultId,resultLevel,jobId,skillId,quantities FROM RecipeData"):
        iid=int(r["resultId"])
        qty=as_json(r["quantities"],[])
        ids=ingredients.get(str(r["id"]),[])
        if not qty or not ids or len(qty)!=len(ids) or str(iid) not in items or any(str(x) not in items for x in ids):
            ignored_recipes+=1
            continue
        comp=[]
        for ingred,quantity in zip(ids,qty):
            if quantity and int(quantity)>0:comp.append([ingred,int(quantity)])
        if not comp:
            ignored_recipes+=1
            continue
        recipes[str(int(r["jobId"] or 1))].append([iid,max(1,int(r["resultLevel"] or 1)),comp,int(r["skillId"] or 0)])
    for data in recipes.values(): data.sort(key=lambda r:(r[1],items[str(r[0])][0]))

    areas={}
    for r in db.execute("SELECT id,nameId FROM AreaData"):
        areas[str(r["id"])]=trans(r["nameId"],"Région sans nom")
    zones={}
    locations=defaultdict(set)
    for r in db.execute("SELECT id,nameId,areaId,level,monsters,harvestables,dungeonId FROM SubAreaData"):
        zone_id=str(r["id"]);region=areas.get(str(r["areaId"]),"Monde des Douze")
        mobs=[int(mid) for mid in as_json(r["monsters"],[]) if str(mid).lstrip('-').isdigit()]
        # Les monstres sont dans la zone telle qu'elle est définie par DOFUS,
        # même lorsque le monstre n'est pas un monstre classique de surface.
        for mid in mobs:locations[mid].add(int(r["id"]))
        zones[zone_id]=[trans(r["nameId"],f"Sous-zone {zone_id}"),region,
                        max(1,int(r["level"] or 1)),mobs,
                        [int(x) for x in as_json(r["harvestables"],[]) if str(x) in items],
                        int(r["dungeonId"] or -1)]

    monsters={}
    drops_total=0
    qualified_skipped=0
    for r in db.execute("SELECT id,nameId,gfxId,grades,drops,subareas FROM MonsterData"):
        mid=int(r["id"])
        grades=as_json(r["grades"],[])
        if grades:
            gr=next((g for g in grades if int(g.get("grade",0))==1),grades[0])
        else:gr={}
        lev=max(1,int(gr.get("level") or 1))
        hp=max(1,int(gr.get("lifePoints") or lev*8))
        # Les XP officiels de DOFUS sont trop élevés pour la courbe de ce prototype,
        # on expose le niveau/les PV DOFUS, puis la logique du jeu est adaptée.
        candidate=[]
        for d in as_json(r["drops"],[]):
            iid=str(d.get("objectId"))
            if iid not in items:continue
            # Une restriction (quête, classe, alignement, etc.) n'est pas interprétée.
            if (d.get("hasCriterions") or str(d.get("criterions") or "").strip()):
                qualified_skipped+=1
                continue
            try:rate=float(d.get("percentDropForGrade1",0))
            except (TypeError,ValueError):continue
            if not 0<rate<=100:continue
            candidate.append([int(iid),round(rate,4)])
        candidate.sort(key=lambda d:-d[1])
        drops_total+=len(candidate)
        # La liste des sous-zones provient de SubAreaData.monsters et MonsterData.subareas.
        for zid in as_json(r["subareas"],[]):
            if str(zid) in zones:locations[mid].add(int(zid))
        monsters[str(mid)]=[trans(r["nameId"],f"Monstre {mid}"),lev,hp,int(r["gfxId"] or 0),
                            candidate,sorted(locations[mid])]
    # Conserver les zones réelles uniquement, éviter d'ajouter les données fantômes.
    for z in zones.values():z[3]=[mid for mid in z[3] if str(mid) in monsters]
    # Prendre aussi les liens MonsterData.subareas qui ne sont pas dans la liste SubAreaData.monsters.
    for mkey,m in monsters.items():
        for zid in m[5]:
            z=zones.get(str(zid))
            if z and int(mkey) not in z[3]:z[3].append(int(mkey))
    for z in zones.values():z[3].sort(key=lambda mid:(monsters[str(mid)][1],monsters[str(mid)][0]))

    # Pour la migration locale sans perdre les niveaux ni les items déjà récoltés.
    legacy={"wood":2,"farmer":28,"mining":24,"fishing":36,"alchemy":26}
    manifest_path=ROOT/"assets"/"manifest.json"
    olditems={}
    if manifest_path.exists():
        manifest=as_json(manifest_path.read_text(encoding="utf-8"),{})
        for obj in manifest.get("assets",[]):
            if obj.get("type")=="item" and str(obj.get("id")) in items:
                olditems[obj["key"]]=obj["id"]
    # Correspondances entre objets de type modifiable et métiers
    special={str(r["SkillData_id"]):int(r["target_id"]) for r in db.execute(
        "SELECT SkillData_id,target_id FROM SkillData_modifiableItemTypeIds_junction")}
    special_by_job=defaultdict(set)
    for skillid,typeid in special.items():
        s=db.execute("SELECT parentJobId FROM SkillData WHERE id=?",(skillid,)).fetchone()
        if s:special_by_job[str(s["parentJobId"])].add(typeid)

    meta={"source":"ledouxm/dofus-sqlite","version":RELEASE,
          "items":len(items),"jobs":len(jobs),"gather":sum(map(len,gather.values())),
          "recipes":sum(map(len,recipes.values())),"monsters":len(monsters),
          "zones":len(zones),"drops":drops_total,
          "ignoredRecipes":ignored_recipes,"conditionalDropsSkipped":qualified_skipped,
          "rateNote":"Pourcentages DOFUS grade 1, sans bonus de prospection ni conditions de quête.",
          "gameplayNote":"La vitesse, les kamas, les points de vie joueur et l'XP idle sont adaptés."}
    jwrite(OUT/"core.json",{"meta":meta,"jobs":jobs,"items":items,"types":item_types,
                             "gather":dict(gather),"recipes":dict(recipes),
                             "legacyJobs":legacy,"legacyItems":olditems,
                             "specialTypes":{jid:sorted(t) for jid,t in special_by_job.items()}})
    jwrite(OUT/"world.json",{"monsters":monsters,"zones":zones})
    jwrite(OUT/"manifest.json",meta)
    print("DOFUS IDLE FULL DATA",json.dumps(meta,ensure_ascii=False),flush=True)
    assert len(jobs)>=20 and len(items)>=21000 and len(monsters)>=5000
    assert len(zones)>=500 and meta["recipes"]>=4500 and meta["gather"]>=70
    assert len(recipes.get("27",[]))>500 and len(recipes.get("15",[]))>500
    assert len(zones["444"][3])>=4
    assert len(monsters["979"][4])>1
    print("EXEMPLES Tailleur",len(recipes["27"]),"Cordonnier",len(recipes["15"]),
          "Mineur",gather.get("24",[])[:5],flush=True)
    print("VALIDATION RÉUSSIE",flush=True)

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("ÉCHEC FULL DATABASE",str(exc),file=sys.stderr)
        raise
