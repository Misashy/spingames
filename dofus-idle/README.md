# DOFUS IDLE — Monde des Douze (version 5)

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

## Interface de combat V3 : régions, zones et stuff

Le nouvel écran de combat utilise une navigation progressive inspirée de la disposition Melvor :

- **Régions** : clique sur Incarnam, Amakna, Île des Wabbits, Île de Moon, Frigost, Astrub, Pandala, Otomaï, Saharach, Cania et les autres zones réellement présentes dans la base DOFUS.
- **Zones** : chaque région présente ses sous-zones de combat en cartes repliables, par niveau. Cliquer sur une zone révèle ses véritables monstres, leur niveau, leurs PV et les actions « Combattre » et « Butins ».
- **Donjons** : onglet distinct filtré sur le champ de donjon de la sous-zone (ex. Crypte de Kardorim).
- **Combat** : un panneau joueur affiche ses PV, statistiques et emplacements de stuff ; un panneau adversaire affiche ses PV, son portrait, les boutons de combat et ses butins.
- **Drops DOFUS** : les taux d'objets ordinaires et les drops conditionnels restent séparés ; les conditions de quête non simulées n'ouvrent pas droit au butin.
- **Stuff bonus (mécanique DOFUS IDLE, non officielle)** : à chaque victoire, **3 % de chance** d'obtenir un équipement supplémentaire, ou **5 %** si le monstre se trouve dans un donjon. Le nom et le niveau de l'objet existent dans la base DOFUS, et l'objet est tiré parmi les équipements de craft compatibles avec le niveau du monstre. Le butin arrive dans la Banque ; le personnage doit atteindre le niveau de l'objet pour l'équiper. Le taux et l'association monstre-équipement sont **inventés pour le prototype**, distincts des drops du client.
- **Sauvegardes conservées** : la clé locale de la version 2 est inchangée, ainsi que les clés de banque et d'équipement ; aucune remise à zéro lors de ce changement d'interface.
- **Nettoyage d'affichage** : suppression des marqueurs littéraux « null » ou « undefined » quand une traduction est absente.

## Version 4 : fiche personnage, butins et succès

- **19 classes jouables dans le menu Personnage** : les noms et portraits officiels sont reliés aux identifiants BreedData du client DOFUS 3 (portraits de classe extraits de images-class.zip, fichier assets/classes/catalog.json). Chaque classe possède une spécialisation de combat simplifiée et modifiable dans le prototype.
- **Caractéristiques** : 5 points de capital par niveau (donc 995 points au niveau 200). Vitalité 1:1, Sagesse 3:1, Force/Intelligence/Chance/Agilité 1:1 jusqu'à 100, 2:1 jusqu'à 200, 3:1 jusqu'à 300, 4:1 jusqu'à 400 puis 5:1. Les points non distribués restent disponibles. Leur effet sur les dégâts/soins/XP et la réinitialisation gratuite sont des adaptations propres à DOFUS IDLE.
- **Butin temporaire sous l'aventurier** : les ressources gagnées contre les monstres, y compris les équipements bonus, restent dans la poche de butin. Le joueur choisit individuellement ou en une seule action de tout récupérer dans la banque, tout vendre contre des kamas, ou tout jeter (confirmation demandée). La poche est sauvegardée dans localStorage et limite les types d'objets accumulables pour éviter une sauvegarde infinie. Les objets récoltés et fabriqués vont toujours directement en banque.
- **Journal illustré** : chaque victoire conserve le portrait du monstre et ses objets avec icônes officielles, quantités et kamas. Les entrées de l'ancien journal texte continuent de s'afficher après migration.
- **Succès DOFUS IDLE** : 27 objectifs de combat, exploration, métiers, personnage et butins. Les succès accomplis offrent des kamas et de l'XP après validation manuelle ; les récompenses déjà reçues ne peuvent pas être réclamées une deuxième fois. Les objectifs sont des créations spécifiques au prototype, pas la liste officielle des succès DOFUS.
- **Régions et zones classées par niveau** par défaut du plus faible au plus élevé, avec option d'ordre décroissant ; les monstres à l'intérieur des zones sont triés par niveau croissant.
- **Progression conservée** : la clé localStorage reste "dofus-idle-full-v2". Les nouvelles propriétés de caractéristiques, succès, butins et historique sont ajoutées aux anciennes sauvegardes sans remplacer les kamas, XP, inventaires, niveaux de métiers, équipements et objets existants.

## Version 5 : 22 382 succès et objectifs de longue durée

Les objectifs sont générés au chargement depuis les données DOFUS 3.7.14.18 et les 27 objectifs historiques. Ils ne constituent pas le catalogue officiel de succès d'Ankama : ce sont des succès propres à DOFUS IDLE, avec des identités de monstres, ressources, recettes, métiers et zones tirées de la base du jeu.

- 22 382 succès testés sur la version de données épinglée.
- 15 414 succès de bestiaire : pour chacun des 5 135 monstres, première victoire et paliers de 10 et 50 victoires, ainsi que des objectifs globaux.
- 4 830 succès d'artisanat : chaque recette fabriquée au moins une fois, quantité par métier et progression globale des crafts.
- 1 466 succès d'exploration : visite de zones, découvertes de régions et paliers de combats propres aux 569 sous-zones.
- 353 succès de récolte, 248 succès de métiers avec paliers jusqu'au niveau 200, 71 succès transversaux (personnage, économie, équipement, combat et butins).
- Récompenses individuelles en kamas, XP et points de succès. Chaque récompense se récupère une seule fois ; la récupération groupée est plafonnée à 40 succès par action.
- Recherche textuelle par nom de monstre, recette, zone ou ressource ; filtres de catégories et de statut, tri et pagination de 32 cartes pour garder une interface fluide.
- Suivi de trois succès favoris sous le panneau Aventurier, avec progression et récompenses.

### Compatibilité des sauvegardes

La clé de stockage dofus-idle-full-v2 et les 27 identifiants historiques success-0 à success-26 restent inchangés. Les combats déjà gagnés sont reconnus dans dex, les maîtrises de récolte dans mastery, les zones dans visitedZones et les niveaux dans jobs. Les anciennes sauvegardes ne stockaient pas les crafts distincts par recette ni les victoires par zone : ces compteurs spécifiques commencent donc à cette mise à jour, sans inventer un historique inexistant.

Le compteur totalSeconds mesure les périodes avec une activité en cours, y compris le calcul des actions hors ligne ; il ne récompense pas une page simplement laissée ouverte.

Tests de non-régression : le workflow dofus-idle-smoke.yml exécute smoke-full.cjs et achievements-full.cjs pour valider la taille du catalogue, les sauvegardes, les vrais crafts, la recherche, le suivi et la récupération unique des récompenses.

## Version 6 : Banque triable, toutes les caractéristiques, KO visible

### Banque classée comme dans DOFUS

La banque utilise exclusivement les métadonnées du client DOFUS 3 déjà intégrées : ItemData.typeId et ItemTypeData.categoryId/nameId. Elle propose un onglet Tous affichant la totalité des objets possédés, puis des onglets Équipements, Consommables, Ressources, Objets de quête, Cosmétiques et Autres (affichés lorsqu'ils contiennent des objets). Le second filtre liste les véritables types d'objet disponibles dans la catégorie : Coiffe, Cape, Bois, Minerai, etc. Les labels de type proviennent directement des traductions françaises du client.

La recherche accepte les noms d'objets et les types, avec une comparaison tolérante aux accents. Les tris possibles sont nom, type, niveau croissant/décroissant, quantité et valeur. Le bouton Afficher tout réinitialise l'ensemble des filtres. L'onglet Tous est le comportement par défaut. Les filtrages restent locaux à l'interface et ne modifient pas l'inventaire ni le format de sauvegarde.

### Combats avec KO visible

Lorsqu'une attaque inflige le coup fatal (y compris un one-shot), la cible reste affichée avec 0 PV et une barre complètement vide, ainsi qu'un message Monstre vaincu. Les attaques sont suspendues pendant 1,8 seconde avant la réapparition du prochain monstre avec sa barre remplie. Les dégâts flottants et coups critiques fonctionnent pendant cette transition.

### Fiche avancée des caractéristiques DOFUS

L'onglet Personnage présente une fiche complète organisée en groupes : caractéristiques de base, points de vie et de bouclier, PA/PM/PO, initiative, prospection, invocations, pods, puissance et soins, dommages fixes et élémentaires, dommages critiques/poussée/pièges/sorts/armes/mêlée/distance, résistances fixes et pourcentages, tacle, fuite, esquives et retraits PA/PM, ainsi que les caractéristiques spécifiques au combat idle.

Précision importante : la base actuelle des objets ne contient pas les jets d'effets des équipements. Seules les caractéristiques effectivement appliquées par le moteur idle sont marquées Idle et calculées ; les autres sont affichées comme Indicatif et ne sont pas encore utilisées pour calculer les combats. Les bonus officiels détaillés des équipements, les PA/PM et les sorts DOFUS ne sont pas simulés.

Le test de non-régression bank-character-combat.cjs valide les cinq catégories présentes dans les données de test, les types officiels, l'onglet Tous, les tris, les groupes de statistiques, le KO immédiat à 0 PV, la pause et le rétablissement des PV.

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
