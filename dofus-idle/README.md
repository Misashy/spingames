# DOFUS IDLE — Monde des Douze (version 2)

Jeu idle sur navigateur inspiré par Melvor Idle, utilisant les noms, métiers, recettes et monstres de DOFUS 3.7.14.18. Projet indépendant de dofus-clicker.

**Jouer :** https://misashy.github.io/spingames/dofus-idle/

## Données intégrées

Source : https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18

- 22 métiers du client DOFUS (les 23 entrées JobData moins la catégorie technique Base), dont les cinq métiers de récolte, Tailleur, Cordonnier, Bijoutier, Forgeron, Sculpteur, Bricoleur, Façonneur, Chasseur, Forgemage et spécialisations, Éleveur et Bestiologue.
- 85 récoltes uniques issues des SkillData visibles, avec leurs niveaux minimaux officiels.
- 4 743 recettes de fabrication issues de RecipeData avec leur objet produit, métier, niveau, et la totalité des ingrédients et quantités.
- 21 622 objets : union ItemData et WeaponData.
- 5 135 monstres avec noms FR, niveaux du premier grade, PV, drops et liens de zones.
- 569 sous-zones avec région, niveau et groupes de monstres tirés de SubAreaData et MonsterData.subareas.
- 4 922 drops de monstres sans conditions simulés en combat, plus 7 938 drops conditionnels qui sont affichés mais pas tirés.

## Graphismes

Les images proviennent des archives DOFUS 3 images-item.zip, images-monster.zip, images-job.zip, avec rapprochement par iconId et gfxId — jamais par ressemblance.
- 18 488 objets avec image officielle.
- 5 130 monstres avec image officielle.
- 22 métiers avec image officielle.
- 143 atlas WebP HD, total d'environ 76 Mo.

Les entrées sans PNG officiel gardent un pictogramme de secours. Les images des arbres, minerais, poissons et plantes sont les icônes d'inventaire officielles, pas des modèles 3D du décor. Les monstres ont des portraits statiques, pas leurs animations squelettiques.

## Fonctionnalités

- Métiers, ressources par niveau, récolte automatique et progression hors ligne jusqu'à huit heures.
- Fabrication répétée des recettes du client avec vérification de tous les ingrédients.
- Recherche par nom, filtres de niveau et ingrédients disponibles.
- Recherche des sources de chaque ingrédient : récoltes, crafts et drops de monstres avec pourcentages.
- Banque, vente d'objets, équipements, magasin de bonus et niveaux de métiers.
- Régions et sous-zones par niveau, combats automatiques, loot et bestiaire complet avec recherche.
- Sauvegarde automatique, export/import JSON et migration des ressources, kamas et niveaux de l'ancienne sauvegarde.

## Fidélité et limites

Noms, objets, recettes, quantités, niveaux de ressources, emplacements de monstres et taux de drop de base du premier grade sont extraits des données du client. Le temps de récolte, la vitesse de craft, les XP, les dégâts, les kamas, les bonus d'équipement et l'équilibrage sont adaptés à ce jeu idle : ils ne reproduisent pas les valeurs officielles.

Les drops ayant des critères de quêtes, classes, événements ou statuts sont montrés comme « conditionnels » avec leur taux de base, mais ne sont pas distribués tant que les règles correspondantes ne sont pas reproduites. Les taux normaux ne simulent pas la prospection ni les modificateurs DOFUS.

Les métiers sans recettes normales (forgemagie, élevage, certaines spécialisations) sont référencés et disposent d'un entraînement idle simplifié : le système de runes, élevage, montures et autres fonctionnalités complexes n'est pas une reconstitution intégrale du jeu original.

## Maintenance

- tools/build_full_database.py : transforme le SQLite en data/core.json et data/world.json.
- tools/build_atlases.py : crée les sprites WebP et data/images.json depuis les archives officielles.
- .github/workflows/dofus-idle-full-data.yml : reconstruction, contrôles de données, tests UI et publication des assets.
- .github/workflows/dofus-idle-smoke.yml et tests/smoke-full.cjs : vérification des actions métiers, recettes et zones.
- game-full.js et full.css : nouveau moteur et interface. Les fichiers historiques restent dans le dépôt.

La version DOFUS est épinglée pour éviter de mélanger les identifiants, recettes et images provenant de deux mises à jour différentes.

© Ankama pour les ressources graphiques et données DOFUS, sous réserve des autorisations applicables à leur usage.
