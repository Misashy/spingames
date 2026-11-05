#!/usr/bin/env python3
"""Patch ciblé Elden Ring pour la version actuelle de SpinGames.
Ne touche ni aux données officielles, ni à Supabase, ni aux autres jeux.
Exécuter après extraction à la racine du dépôt GitHub spingames.
"""
from pathlib import Path
import re

ROOT=Path.cwd()
JS=ROOT/'assets'/'game.js'
HTML=ROOT/'jeux'/'elden-ring'/'index.html'
ART=ROOT/'assets'/'game-art'
IMAGES=(
    'elden-ring-wheel-difficile.webp',
    'elden-ring-wheel-extreme.webp',
    'elden-ring-wheel-defi-trool.webp',
)

def main():
    if not JS.is_file() or not HTML.is_file():
        raise SystemExit('Exécuter depuis la racine de Misashy/spingames.')
    missing=[name for name in IMAGES if not (ART/name).is_file()]
    if missing:
        raise SystemExit('Images manquantes : '+', '.join(missing))
    original=JS.read_text(encoding='utf-8')
    source=original
    anchor="  ['defi trool','fortnite-wheel-defi-trool.webp']\n ]):null;"
    target="""  ['defi trool','fortnite-wheel-defi-trool.webp']
 ]):game.slug==='elden-ring'?new Map([
  ['defi difficile','elden-ring-wheel-difficile.webp'],
  ['defi extreme','elden-ring-wheel-extreme.webp'],
  ['defi trool','elden-ring-wheel-defi-trool.webp']
 ]):null;"""
    if "['defi difficile','elden-ring-wheel-difficile.webp']" not in source:
        if source.count(anchor)!=1:
            raise SystemExit('La structure du mapping a changé : faire adapter ce patch par Codex, ne pas remplacer game.js.')
        source=source.replace(anchor,target,1)
    old="const src=`../../assets/game-art/${minecraftArt.get(name)||(game.slug==='fortnite'?'fortnite-wheel-facile.webp':'minecraft.webp')}`;"
    new="const src=`../../assets/game-art/${minecraftArt.get(name)||(game.slug==='fortnite'?'fortnite-wheel-facile.webp':game.slug==='elden-ring'?'elden-ring-wheel-difficile.webp':'minecraft.webp')}`;"
    if old in source:
        source=source.replace(old,new,1)
    elif new not in source:
        raise SystemExit('Le chargement des images a changé : faire adapter ce patch par Codex sans remplacer le moteur.')
    for marker in ('function drawMinecraftSector(', 'function drawMinecraftLabel(', 'if(minecraftArt)drawMinecraftSector', 'if(minecraftArt)drawMinecraftLabel'):
        if marker not in source:
            raise SystemExit('Moteur inattendu : '+marker)
    page=HTML.read_text(encoding='utf-8')
    pattern=re.compile(r'(assets/game\.js)(\?v=[\w-]+)?(?=")')
    if not pattern.search(page):
        raise SystemExit('Référence game.js introuvable dans la page Elden Ring.')
    new_page=pattern.sub(r'\g<1>?v=20261105-elden-art1',page)
    # Écriture atomique logique : tous les contrôles précèdent les deux modifications.
    if source!=original:
        JS.write_text(source,encoding='utf-8')
        print('Modifié : assets/game.js (mapping Elden Ring et image de repli)')
    if new_page!=page:
        HTML.write_text(new_page,encoding='utf-8')
        print('Modifié : jeux/elden-ring/index.html (version cache JS)')
    print('3 images Elden Ring prêtes. Aucun JSON, profil, compte ou autre jeu modifié.')
    print('Tester dans le navigateur avant commit/push.')

if __name__=='__main__':
    main()
