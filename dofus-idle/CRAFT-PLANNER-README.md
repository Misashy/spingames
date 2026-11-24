# DOFUS IDLE — Guide de fabrication des panoplies

Nouveau menu **Catalogue → 🧰 Guide de fabrication**. Une option **« Préparer la fabrication »** est également ajoutée à chaque panoplie dans **Collections**.

## Fonctionnement

1. Recherche une panoplie parmi les 527 panoplies du référentiel d'équipements DOFUS déjà présent.
2. Le guide réserve virtuellement les pièces déjà en banque ou équipées, sans les consommer.
3. Pour les pièces manquantes, il cherche les recettes dans les **4 743 recettes DOFUS intégrées** et décompose les ingrédients en sous-recettes récursives (profondeur plafonnée à 18, cycles signalés).
4. Les quantités partagées sont calculées sur un **stock commun virtuel** pour éviter de compter deux fois un ingrédient.
5. Il affiche l'ordre des fabrications, les niveaux de métier requis et les ressources à collecter.
6. Les ressources proposent des liens vers le métier de récolte correspondant ou les monstres qui les donnent (butins non conditionnels).
7. Le nombre de combats estimé est calculé à partir du taux de butin de base : ce n'est ni une garantie ni un rendement réel.

## Limites explicites

- Guide consultatif : aucun objet, kama ou ressource n'est consommé, créé ou ajouté automatiquement à la file de fabrication.
- Une panoplie peut contenir des pièces sans recette disponible dans la base actuelle. Ces impossibilités sont signalées ; aucune génération d'équipement en combat n'a été réintroduite.
- Seuls les butins sans conditions réellement simulés dans le jeu sont présentés comme sources directes des monstres.
- Les ressources dans la poche de butin non encore transférées en banque ne sont pas comptées comme stock disponible.
- Le plan choisit une recette par objet, en privilégiant un métier déjà suffisamment monté ; il ne calcule pas toutes les variantes de fabrication possibles.

## Implémentation et tests

- `craft-planner.js` : index des recettes, nomenclature récursive, stock partagé et interface.
- `craft-planner.css` : interface responsive.
- `game-full.js` : navigation, progression des panoplies et raccourcis de ressources/combats.
- `tests/craft-planner.cjs` : test de stock partagé, sous-recettes, boucle de recette, rendu et navigation depuis Collections.
- `.github/workflows/dofus-idle-smoke.yml` : ajout de ces vérifications aux tests existants.

**Compatibilité :** aucune migration ni nouvelle clé de sauvegarde ; le choix de la panoplie est mémorisé dans `plannerSetId` sous `dofus-idle-full-v2`.

**Sauvegarde Git :** `backup/dofus-idle-before-craft-planner-20261124`.
