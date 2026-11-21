#!/usr/bin/env python3
"""Importer les vrais pictogrammes DOFUS 3 par ItemData.iconId / MonsterData.gfxId.

La base complète DOFUS (dofus.sqlite, ~386 Mo) reste dans la release source :
on indexe ici TOUS les ItemData / MonsterData / JobData français et on embarque
uniquement les PNG utilisés par DOFUS IDLE pour ne pas ralentir GitHub Pages.
Aucune recherche par nom de fichier, aucun sprite d'une autre espèce.
"""
from __future__ import annotations

import gc
import io
import json
import os
from pathlib import Path
import re
import sys
import unicodedata
from urllib.request import Request, urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RELEASE = os.getenv("DOFUS_RELEASE_TAG", "v6.0_3.7.14.18")
BASE = f"https://github.com/ledouxm/dofus-sqlite/releases/download/{RELEASE}"
SOURCE = "ledouxm/dofus-sqlite"
PNG = b"\x89PNG\r\n\x1a\n"

# Ces clés sont les identifiants de sauvegarde du prototype : ne jamais les modifier.
# Pas de ressemblance visuelle approximative : seule une traduction française exacte est admise.
ITEM_NAMES = {
    "ash": "Bois de Frêne", "chestnut": "Bois de Châtaignier",
    "walnut": "Bois de Noyer", "oak": "Bois de Chêne", "bombu": "Bois de Bombu",
    "maple": "Bois d'Érable", "yew": "Bois d'If", "bamboo": "Bois de Bambou",
    "cherry": "Bois de Merisier", "ebony": "Bois d'Ébène",
    "wheat": "Blé", "barley": "Orge", "oat": "Avoine",
    "hop": "Houblon", "flax": "Lin", "rye": "Seigle", "rice": "Riz",
    "hemp": "Chanvre", "corn": "Maïs",
    "iron": "Fer", "copper": "Cuivre", "bronze": "Bronze",
    "cobalt": "Kobalte", "manganese": "Manganèse", "tin": "Étain",
    "silver": "Argent", "bauxite": "Bauxite", "gold": "Or",
    "gudgeon": "Goujon", "shrimp": "Greuvette", "trout": "Truite",
    "crab": "Crabe Sourimi", "catfish": "Poisson-Chaton",
    "breadedfish": "Poisson Pané", "carp": "Carpe d'Iem", "pike": "Brochet",
    "nettle": "Ortie", "sage": "Sauge", "clover": "Trèfle à 5 feuilles",
    "mint": "Menthe Sauvage", "orchid": "Orchidée Freyesque",
    "edelweiss": "Edelweiss", "ginseng": "Ginseng", "mandrake": "Mandragore",
    "plume_tofu": "Plume de Tofu", "fleur": "Fleur de Pissenlit Diabolique",
    "petale": "Pétale de Rose Démoniaque", "feuille": "Feuille de Tournesol Sauvage",
    "etincelle": "Cendres Éternelles", "laine": "Laine de Bouftou",
    "os_chafer": "Os de Chafer", "gelatine": "Gelée à la Menthe",
    "pain": "Pain de Mie", "potion": "Potion de soin",
    "anneau": "Anneau de Bouze le Clerc",
    "coiffe": "Coiffe du Bouftou",
    "epee": "Épée de Boisaille", "cape": "Cape Bouffante",
}
JOB_NAMES = {
    "wood": "Bûcheron", "farmer": "Paysan", "mining": "Mineur",
    "fishing": "Pêcheur", "alchemy": "Alchimiste",
}


def fetch(filename: str) -> bytes:
    url = BASE + "/" + filename
    print("Téléchargement:", filename, flush=True)
    req = Request(url, headers={"User-Agent": "SpinGames-DofusIdle-assets/1.0"})
    with urlopen(req, timeout=300) as response:
        return response.read()


def records(value, required):
    """Compatibilité enveloppes de listes/dictionnaires exportées par Unity."""
    if isinstance(value, list):
        for x in value:
            if isinstance(x, (dict, list)):
                yield from records(x, required)
    elif isinstance(value, dict):
        if all(key in value for key in required):
            yield value
        else:
            for x in value.values():
                if isinstance(x, (dict, list)):
                    yield from records(x, required)


def number(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def canonical(value):
    # Les espaces insécables, les apostrophes courbes et les accents composés
    # ne changent pas l'identité linguistique de la ressource.
    return unicodedata.normalize("NFC", str(value)).replace("\u00a0", " ").replace("’", "'").strip().casefold()


def load_catalog(filename, mandatory, namekey, translations):
    decoded = json.loads(fetch(filename))
    catalog = []
    for obj in records(decoded, mandatory):
        ident = number(obj.get("id"))
        icon = number(obj.get(namekey))
        translated = translations.get(str(obj.get("nameId")))
        if ident is None or icon is None or not isinstance(translated, str) or not translated.strip():
            continue
        entry = {"id": ident, namekey: icon, "name": translated.strip()}
        if "level" in obj and number(obj["level"]) is not None:
            entry["level"] = number(obj["level"])
        if "typeId" in obj and number(obj["typeId"]) is not None:
            entry["typeId"] = number(obj["typeId"])
        catalog.append(entry)
    del decoded
    gc.collect()
    if len(catalog) < (1000 if filename != "jobsdata.json" else 1):
        raise RuntimeError(f"Catalogue incomplet ou format inconnu pour {filename}: {len(catalog)}")
    catalog.sort(key=lambda x: x["id"])
    print(f"  -> {len(catalog)} entrées validées", flush=True)
    return catalog


def source_monster_names(js):
    # Identifiants explicites des monstres du jeu (entre crochets et avec leur vrai nom).
    pairs = re.findall(r"\['(\d{2,6})','([^']+)',", js)
    selected = {}
    for ident, name in pairs:
        selected[ident] = name
    if len(selected) < 20:
        raise RuntimeError(f"Impossible de retrouver les 24 monstres de DOFUS IDLE: {len(selected)}")
    return selected


def choose(candidates, expected):
    hits = candidates.get(canonical(expected), [])
    unique_icons = {r["iconId"] for r in hits}
    if len(unique_icons) != 1:
        return None, ("introuvable" if not hits else "nom ambigu, plusieurs iconId")
    return next(r for r in hits if r["iconId"] in unique_icons), None


def archive_png(archive, gfx):
    names = (f"2x/{gfx}.png", f"1x/{gfx}.png", f"{gfx}.png")
    for name in names:
        try:
            content = archive.read(name)
        except KeyError:
            continue
        if content.startswith(PNG):
            return content, name
    return None, None


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    js = (ROOT / "game.js").read_text(encoding="utf-8")
    monster_requests = source_monster_names(js)
    translations = json.loads(fetch("i18n_fr.json"))
    items = load_catalog("itemsdata.json", ("id", "nameId", "iconId"), "iconId", translations)
    monsters = load_catalog("monstersdata.json", ("id", "nameId", "gfxId"), "gfxId", translations)

    # jobsdata peut ne pas contenir iconId : l'index métier est facultatif.
    try:
        jobs = load_catalog("jobsdata.json", ("id", "nameId", "iconId"), "iconId", translations)
    except RuntimeError as ex:
        print("Note: icônes de métiers non résolues:", ex, flush=True)
        jobs = []
    del translations
    gc.collect()

    if len(items) < 10000 or len(monsters) < 4000:
        raise RuntimeError("La base complète des items et monstres DOFUS 3 n'a pas été récupérée.")
    write_json(ASSETS / "database" / "items.fr.json", {
        "source": SOURCE, "release": RELEASE, "total": len(items), "items": items})
    write_json(ASSETS / "database" / "monsters.fr.json", {
        "source": SOURCE, "release": RELEASE, "total": len(monsters), "monsters": monsters})
    write_json(ASSETS / "database" / "jobs.fr.json", {
        "source": SOURCE, "release": RELEASE, "total": len(jobs), "jobs": jobs})

    by_name = {}
    for entry in items:
        by_name.setdefault(canonical(entry["name"]), []).append(entry)
    by_monster = {str(entry["id"]): entry for entry in monsters}
    by_jobname = {}
    for entry in jobs:
        by_jobname.setdefault(canonical(entry["name"]), []).append(entry)

    chosen_items, chosen_mobs, chosen_jobs, missing = {}, {}, {}, []
    for key, french_name in ITEM_NAMES.items():
        entry, why = choose(by_name, french_name)
        if why:
            missing.append({"type": "item", "key": key, "name": french_name, "reason": why})
        else:
            chosen_items[key] = entry
    for monster_id, french_name in monster_requests.items():
        entry = by_monster.get(monster_id)
        if entry is None or canonical(entry["name"]) != canonical(french_name):
            missing.append({"type": "monster", "key": monster_id, "name": french_name,
                            "reason": "id absent ou nom officiel différent",
                            "official": entry["name"] if entry else None})
        else:
            chosen_mobs[monster_id] = entry
    for skill, french_name in JOB_NAMES.items():
        matches = by_jobname.get(canonical(french_name), [])
        icons = {r["iconId"] for r in matches}
        if len(icons) == 1:
            chosen_jobs[skill] = matches[0]
        else:
            missing.append({"type": "job", "key": skill, "name": french_name,
                            "reason": "métier sans iconId unique"})

    mapping = {"release": RELEASE, "items": {}, "monsters": {}, "jobs": {}}
    imports = []
    categories = [
        ("item", "items", chosen_items, "iconId"),
        ("monster", "monsters", chosen_mobs, "gfxId"),
        ("job", "jobs", chosen_jobs, "iconId"),
    ]
    for archive_name, bucket, selected, field in categories:
        if not selected:
            continue
        archive = ZipFile(io.BytesIO(fetch(f"images-{archive_name}.zip")))
        for key, entry in selected.items():
            icon_id = entry[field]
            data, origin = archive_png(archive, icon_id)
            if data is None:
                missing.append({"type": archive_name, "key": key, "name": entry["name"],
                                "reason": f"PNG absent pour {field}={icon_id}"})
                continue
            out = ASSETS / bucket / f"{key}.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            url = f"assets/{bucket}/{key}.png"
            mapping[bucket][key] = url
            imports.append({"type": archive_name, "key": key,
                            "id": entry["id"], field: icon_id,
                            "officialNameFr": entry["name"], "file": url,
                            "sourceInZip": origin, "bytes": len(data)})
        archive.close()

    # Si on met à jour le jeu, supprimer tout ancien PNG devenu sans correspondance.
    for bucket in ("items", "monsters", "jobs"):
        directory = ASSETS / bucket
        if directory.exists():
            for path in directory.glob("*.png"):
                if f"assets/{bucket}/{path.name}" not in mapping[bucket].values():
                    path.unlink()

    if len(mapping["monsters"]) != len(monster_requests):
        raise RuntimeError(
            f"Import incomplet : {len(mapping['monsters'])}/{len(monster_requests)} monstres. "
            "Ne pas publier de portraits incorrects.")

    manifest = {
        "source": SOURCE, "release": RELEASE,
        "completeDatabaseUrl": BASE + "/dofus.sqlite",
        "fullItemCount": len(items), "fullMonsterCount": len(monsters),
        "fullJobCount": len(jobs),
        "needed": {"items": len(ITEM_NAMES), "monsters": len(monster_requests), "jobs": len(JOB_NAMES)},
        "imported": {k: len(mapping[k]) for k in ("items", "monsters", "jobs")},
        "missing": missing, "assets": imports,
        "note": "Données et visuels du jeu source. Gameplay idle non officiel."
    }
    write_json(ASSETS / "manifest.json", manifest)
    (ASSETS / "catalog.js").write_text(
        "window.DOFUS_IDLE_ASSETS = " +
        json.dumps(mapping, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print("IMPORT TERMINÉ", manifest["imported"], "manquants:", len(missing), flush=True)
    if missing:
        print("Non résolus:", json.dumps(missing, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ÉCHEC IMPORT DOFUS 3 :", exc, file=sys.stderr)
        raise
