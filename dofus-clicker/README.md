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

## Noms authentiques FR / mise à jour du 17 novembre 2026

- `assets/monsters/database.fr.json` : index de 5 135 monstres issu de MonsterData + i18n_fr (noms du client DOFUS 3, version `v6.0_3.7.13.17`).
- `assets/monsters/catalog.fr.js` : les 50 portraits employés par les zones du prototype et leurs noms FR associés.
- Chaque portrait provient du `gfxId` du même `MonsterData.id` qui fournit le nom affiché ; ne jamais attribuer au PNG le nom d'un autre monstre.
- Les 26 combats d'Incarnam viennent d'une catégorie historique du wiki anglophone. Seuls 8 ont une image identique dans la version DOFUS 3 ; les 18 autres utilisent une espèce proche de la base actuelle, **affichée sous son véritable nom français** (ex. variante Blue Lilpiwi → Piou Bleu). Il est donc normal que certains anciens noms aient disparu ou que deux combats historiques correspondent à la même espèce actuelle.
- Les portraits issus de `images-monster.zip` sont des **images fixes 2x**, pas les sprites squelettiques complets du client. Pour les vraies animations : exporter Bones + Skins + données depuis une installation locale DOFUS et les utiliser avec le moteur `PyDofus/d3-ts-renderer`.
- Le changement de monstre précharge + décode le PNG suivant et masque le précédent durant une transition de 350 ms, ce qui supprime l'apparition parasite d'un autre monstre ou de l'emoji provisoire.
- Les tests automatiques `node dofus-clicker/tests/smoke.cjs` vérifient l'identité FR et le changement de cible.

Les ajouts ultérieurs doivent choisir les monstres dans `database.fr.json` par identifiant officiel, puis importer les PNG correspondant à leurs `gfxId`, et **non** par similarité de nom.
