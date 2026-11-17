# DOFUS Clicker — prototype jouable

Mini-jeu pour navigateur dans l'univers DOFUS, hébergé sur GitHub Pages sous le chemin /spingames/dofus-clicker/.

## Première version
- 6 zones, 20+ monstres et boss, clics de combat, auto-DPS, niveaux, XP et kamas.
- 3 améliorations, butin, bestiaire, sauvegarde locale, audio facultatif.
- Animations légères CSS (idle, coup, disparition, dégâts) ; **pas encore** les animations squelettiques DOFUS.
- Images PNG réelles importées dans assets/monsters/<monsterId>.png par le workflow GitHub Actions, avec fallback emoji jusqu'à l'import.

## Import automatique des images
Le workflow .github/workflows/dofus-clicker-import.yml, lancé au premier push, récupère l'archive images-monster.zip et les données monstersdata.json de la dernière release publique stable de ledouxm/dofus-sqlite, fait correspondre MonsterData.id à MonsterData.gfxId et copie uniquement les PNG nécessaires à ce prototype. Il fait ensuite un commit des images dans ce dépôt.

Si le lancement automatique a échoué, ouvrir Actions > Import DOFUS Clicker sprites > Run workflow. Contrôler les logs ; ne pas publier de liens vers des assets manquants en supposant leur présence.

**Droits** : les ressources DOFUS appartiennent à leurs ayants droit. Vérifier que la permission déclarée pour le projet couvre la redistribution publique des assets sur GitHub. Cette automatisation doit être désactivée si ce n'est pas le cas.

## Structure
- index.html, style.css, game.js : jeu statique, aucun build ni backend.
- tools/import_sprites.py : téléchargement et sélection des images.
- assets/monsters : images importées par le workflow.
- assets/manifest.json : état des imports.

## À faire
- Valider les images visuellement et corriger les correspondances si une image présente un défaut.
- Ajouter ensuite des animations WebP issues des vrais fichiers du jeu via PyDofus/d3-ts-renderer et une installation DOFUS locale.
- Missions, équipements, inventaire détaillé, carte, classes, authentification et sauvegarde Supabase.
