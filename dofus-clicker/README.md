# DOFUS Clicker — prototype jouable

Mini-jeu pour navigateur dans l'univers DOFUS, hébergé sur GitHub Pages sous le chemin /spingames/dofus-clicker/.

## Première version
- 6 grandes zones dont Incarnam divisée en 7 territoires, 28 combats de monstres + Kardorim en boss final, clics de combat, auto-DPS, niveaux, XP et kamas.
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


## Incarnam : progression fidèle aux captures du bestiaire (17 novembre 2026)

Les combats avancent automatiquement dans cet ordre :

| Étape | Territoire | Monstres |
|---|---|---|
| 1 | Champs | Pissenlit Miroitant, Rose Vaporeuse, Tofu Chimérique, Tournesol Nébuleux |
| 2 | Route des âmes | Feu de Joie, Feu Follet, Feu Furieux, Feu Vif |
| 3 | Pâturages | Boufton Orageux, Boufton Pâlichon, Bouftor Éthéré, Bouftou Nuageux |
| 4 | Forêt | Chakrobat, Ronronchon, Tigrimas |
| 5 | Lac | Grand Splatch, Petit Gloot, Plikplok |
| 6 | Cimetière | Chafer Débutant, Chafer Éclaireur, Chafer Furtif, Chafer Piquier, Sergent Chafer |
| 7 | Crypte de Kardorim | Les mêmes cinq Chafers **puis Kardorim comme combat final** |

29 rencontres successives (28 monstres + 1 boss), couvrant 24 espèces distinctes.

**Noms et portraits authentiques de DOFUS 3 :** `assets/monsters/database.fr.json` contient les 5 135 noms français et gfxId indexés. `tools/import_sprites.py` télécharge automatiquement les **24 PNG exacts** pour Incarnam depuis la version `v6.0_3.7.13.17`, sans substituts ni traduction manuelle. `assets/monsters/catalog.fr.js` relie les noms et images aux mêmes IDs. Les fichiers PNG sont des portraits fixes avec animation CSS légère, pas les animations squelettiques du client.

**Compatibilité :** les sauvegardes précédentes conservent niveau, expérience, kamas, améliorations, butin et zones débloquées. Seule l'avancée d'Incarnam repart des Champs pour éviter une ancienne position incohérente après le remplacement de la liste.

**Vérifications :** `node dofus-clicker/tests/smoke.cjs` contrôle les sept territoires, l'ordre exact des Chafers dans la Crypte, Kardorim en dernier, le déblocage d'Astrub, le nom français et le chargement sans clignotement.
