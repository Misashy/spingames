# DOFUS IDLE — Monde des Douze (version 9)

Jeu idle sur navigateur inspiré par Melvor Idle, utilisant les noms, métiers, recettes et monstres de DOFUS 3.7.14.18. Projet indépendant de dofus-clicker.

**Jouer :** https://misashy.github.io/spingames/dofus-idle/

## Mise à jour du 24 novembre 2026 — équipements uniquement via le craft

**Règle actuelle :** les monstres et boss ne donnent plus directement d'équipements, y compris via l'ancien tirage bonus de 3 % / 5 %. Le combat procure des ressources et autres butins non équipables ; les équipements se fabriquent ensuite à partir de ces ingrédients dans les métiers. Le bonus de fin de donjon, lorsqu'un butin de ressource existe, est exclusivement une ressource.

Les équipements déjà possédés (banque, équipement porté ou anciens butins en attente) **ne sont pas supprimés**. Les recettes, matériaux et anciens progrès sont conservés. Les objets pour lesquels aucune recette n'existe dans la base actuelle ne deviennent pas automatiquement fabricables.

Les descriptions historiques des versions antérieures figurant plus bas peuvent encore évoquer les « drops de stuff bonus » : ce système est désormais désactivé et supprimé du moteur.

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

## Version 7 — Les vrais bonus des équipements et des panoplies

Source : fichiers clients DOFUS 3.7.14.18 des archives de ledouxm/dofus-sqlite. L'extracteur V7 résout les références Unity EffectInstanceDice dans itemsdata.json et itemsetsdata.json. Les noms d'effets et de panoplies proviennent des traductions françaises du même dofus.sqlite. Il ne remplace ni les noms, ni les recettes, ni les monstres de la base principale.

Données importées dans data/equipment-v7.json :
- 12 396 fiches d'objets avec au moins un effet ou une panoplie.
- 527 panoplies avec la liste exacte de leurs membres et un bonus correspondant à chaque palier.
- 275 types d'effets de la version DOFUS 3 épinglée.
- Bornes de jet minimales et maximales authentiques, reliées aux identifiants d'objet et d'effet.

Interface :
- Banque → Comparer : voir les effets de l'objet, le détail des jets, la panoplie, les bonus de chaque palier, ainsi que les variations de PV, de dégâts et de défense avant d'équiper.
- Personnage → Mes équipements : affichage de 17 emplacements incluant deux anneaux, six slots Dofus/trophées, familier et monture ; les huit emplacements préexistants sont préservés.
- Personnage → Mes panoplies : nombre de pièces portées, progression vers le bonus suivant, et les effets actifs.
- Tous les bonus de panoplie sont pris au palier actuel : par exemple 2 pièces activent le palier 2, 3 pièces remplacent le palier 2 par le palier 3. Ils ne sont pas additionnés entre paliers.
- Équiper et retirer un objet conserve ses identifiants et quantités en banque. La sauvegarde locale historique dofus-idle-full-v2 est conservée sans réinitialisation.

### Fidélité des effets et limites de la V7

**Les plages d'effets et leurs noms sont officiels, le calcul idle reste une adaptation.**
- Les objets n'ont pas encore de jet individuel stocké par exemplaire : le moteur calcule un jet médian déterministe à partir des bornes officielles. Il ne prétend pas que ce jet correspond au meilleur jet ni à un objet réel obtenu chez Ankama.
- Sont notamment reliés au moteur idle : Vitalité, Force, Intelligence, Chance, Agilité, Sagesse, Puissance, coups critiques, dommages simples et résistances reconnues ; les effets modifient les PV, les dégâts, la défense, la chance de critique ou l'XP selon les règles idle documentées.
- Les PA, PM, PO et autres statistiques sont affichés mais le jeu idle n'a pas encore de système de tours, déplacements, sorts ou IA DOFUS. Les effets non interprétés sont explicitement marqués Hors combat idle.
- Les conditions complexes pour équiper certains objets (quêtes, alignements, classe ou caractéristique minimum), la forgemagie, les jets individuels et certaines propriétés des armes ne sont pas encore simulées : seul le niveau de l'objet est vérifié lors de l'équipement.
- La comparaison reflète les statistiques que le moteur idle utilise, y compris la perte ou le gain d'un bonus de panoplie. Aucun bonus arbitraire basé uniquement sur le niveau d'objet n'est ajouté quand les effets officiels existent.

Fichiers V7 :
- tools/build_equipment_v7.py : extraction déterministe des données itemsdata.json/itemsetsdata.json.
- .github/workflows/dofus-idle-equipment-v7.yml : import vérifié et publication du seul fichier equipment-v7.json.
- tests/equipment-v7.cjs : tests des bornes d'effets de la Panoplie du Bouftou, du palier à deux pièces, du comparateur et du retour en banque.
- equipment-v7.css et game-full.js : interface du comparateur et intégration au moteur.

## Version 8 — Sorts de classe, recharges et combat automatique

La Version 8 intègre **57 capacités**, réparties sur les **19 classes disponibles** dans DOFUS IDLE : Iop, Crâ, Sacrieur, Eniripsa, Féca, Osamodas, Enutrof, Sram, Xélor, Ecaflip, Sadida, Pandawa, Roublard, Zobal, Steamer, Eliotrope, Huppermage, Ouginak et Forgelance.

**Attention à la fidélité :** les noms sont empruntés aux techniques ou à l'univers des classes DOFUS, mais les coefficients, recharges, paliers et mécaniques sont **une adaptation conçue pour DOFUS IDLE**. Ce n'est pas une importation intégrale des sorts officiels, de leurs rangs ou de leur comportement tactique.

- Chaque classe débloque trois sorts aux **niveaux 1, 15 et 45**.
- Les techniques donnent de véritables effets sur le combat : frappes élémentaires, dégâts amplifiés contre une cible affaiblie, vol de vie, soins directs, boucliers absorbant les dégâts, protection, esquive, buffs de critique et vitesse d'attaque, ralentissement d'ennemi, dégâts périodiques, invocations, régénération et kamas bonus.
- Les dégâts des sorts utilisent les caractéristiques distribuées par le joueur et les jets moyens du stuff DOFUS déjà intégrés en V7. Les buffs augmentent aussi les attaques ordinaires, sans remplacer le système de coup critique visuel.
- Chaque sort a un temps de recharge propre, et une petite recharge globale de 1,2 seconde empêche d'en lancer plusieurs à la même fraction de seconde.
- L'automatisation est active par défaut pour tous les sorts accessibles, et peut être désactivée **sort par sort**, indépendamment pour chaque classe ; le joueur peut toujours lancer un sort manuellement pendant un combat.
- Dans **Personnage** et sous **Ton aventurier** dans les combats : grimoire avec les 3 capacités, leurs niveaux requis, leurs recharges, les boutons Auto ON/OFF et Lancer. En combat, les buffs actifs et les derniers sorts utilisés sont visibles.
- Le compteur de sorts lancés et les préférences sont conservés dans l'ancienne clé de sauvegarde locale **dofus-idle-full-v2**. Les sauvegardes V7 sont mises à niveau automatiquement. Aucun objet, recette, ancien succès ni niveau n'est supprimé.
- Lors d'un changement de classe en combat, les buffs et recharges temporaires de l'ancienne classe sont effacés pour éviter d'empiler des avantages ; les préférences d'automatisation propres à chaque classe restent sauvegardées.
- Après un coup fatal par sort ou par invocation, la barre de vie adverse reste à **0 PV pendant 1,8 seconde**, comme en V6.

### Limites de la V8

Ce prototype reste **un combat idle en temps réel** et non un combat au tour par tour DOFUS. Les sorts n'utilisent pas encore des points d'action (PA), ni le placement sur une grille ou les déplacements en PM ; ils utilisent des recharges propres au mode idle. Les dégâts sur zone sont représentés par des attaques sur la cible courante. Les effets spécifiques aux mécaniques de chaque classe ont été simplifiés. Les animations de sorts utilisent des textes/emoji, sans prétendre afficher les graphismes authentiques des sorts DOFUS.

Les attaques hors ligne restent désactivées : les récoltes et l'artisanat seuls profitent du calcul hors ligne actuel, afin d'éviter de simuler des combats irréalistes en l'absence du joueur.

Tests automatisés :
- **tests/spells-v8.cjs** vérifie 19 × 3 capacités, les déblocages, sorts automatiques, arrêt de l'automatisation, recharge, soins, boucliers, brûlures, invocations, changements de classe et conservation des anciennes sauvegardes.
- Le workflow **.github/workflows/dofus-idle-smoke.yml** continue aussi de tester les métiers, les 22 382 succès, les catégories de banque, la fiche des caractéristiques et l'équipement/panoplies V7.

## Version 9 — Icônes de sorts, donjons, quêtes, collections et automatisation

### Les 57 icônes authentiques du client DOFUS 3

Les icônes proviennent de images-spell.zip, SpellData et des traductions françaises, version v6.0_3.7.14.18 du référentiel dofus-sqlite. Elles sont téléchargées, optimisées en WebP et publiées dans assets/spells. Le catalogue assets/spells/catalog.json contient 57 associations, dont 46 exactes, 8 proches et 3 illustrations thématiques. Chaque association non exacte signale le nom du sort DOFUS réellement illustré. Le grimoire et l'historique de combat utilisent ces images, avec un pictogramme de secours en cas d'échec de chargement.

Les lancements déclenchent un effet visuel bref de sort avec la véritable icône et un halo correspondant à Terre/Feu/Eau/Air. Un sort en recharge est grisé, un sort prêt se distingue par son halo. Ces effets sont décoratifs et n'ajoutent pas de dégâts invisibles au moteur.

### Donjons et boss

Chaque sous-zone de donjon contenant plusieurs monstres utilisables devient un parcours de salles : jusqu'à quatre types de monstres réels de la zone, puis un boss sélectionné en fonction du niveau conseillé du donjon. La Crypte de Kardorim utilise les monstres officiels d'Incarnam et se termine contre Kardorim. Plus de 180 donjons sont issus des sous-zones disponibles. Les parcours, les limites de niveau, le bouclier de 5 secondes, l'attaque spéciale toutes les 8 secondes et l'enrage à 35 % PV sont des adaptations DOFUS IDLE, pas les règles tactiques officielles.

Lorsqu'un monstre meurt, sa barre reste à 0 PV pendant 1,8 seconde avant le suivant. Le dernier boss valide une seule victoire de donjon, accorde des kamas/XP bonus et une ressource supplémentaire issue de sa table de butin (récompense garantie propre au prototype, sans revendiquer le taux officiel). Le nombre de donjons terminés est sauvegardé dans dungeonClears. Un donjon ne reboucle pas automatiquement après la dernière salle.

### Quêtes régionales

Le carnet de quêtes propose des étapes liées aux régions réelles : découvrir une zone, vaincre un monstre de la région, explorer une autre zone puis terminer un donjon local si disponible. Les étapes sont déverrouillées successivement au sein de chaque région, sans bloquer la libre exploration ailleurs. Les quêtes accordent des kamas et XP et une chaîne régionale complète débloque un titre cosmétique. Les noms de zones, de monstres et de donjons sont issus des données DOFUS ; les scénarios, XP et récompenses sont des créations DOFUS IDLE, et non les quêtes officielles d'Ankama.

### Collections

L'encyclopédie est paginée pour rester fluide :
- Panoplies : pièces actuellement possédées en banque ou équipées, récompense unique pour une panoplie complète, titre de collectionneur à sélectionner sur la fiche Personnage.
- Bestiaire : monstres découverts à partir des victoires réelles.
- Boss : donjons terminés, trophées de progression et lien pour retourner au donjon.
- Régions : zones découvertes au cours de l'exploration.

Une collection de panoplie est acquise quand le joueur possède simultanément toutes les pièces. Il faut récupérer la récompense avant de vendre les pièces. Les titres sont purement cosmétiques et n'accordent pas de statistiques gratuites.

### Automatisation du combat (facultative)

Le menu Automatisation permet :
- butin manuel (défaut), tout en banque, ressources seulement, revente d'objets peu chers non équipables, ou mode mixte ;
- seuil configurable pour les objets peu chers, avec interdiction systématique de vendre automatiquement un équipement ou une pièce de panoplie ;
- consommation automatique de pain/nourriture compatible sous un seuil de PV (soins et délai sont des règles idle) ;
- arrêt automatique du combat sous un seuil de PV pour éviter une défaite ;
- rotation vers un autre monstre accessible de la même zone après 5, 10, 25 ou 50 victoires, sans modifier l'ordre des salles de donjon.

Tous les automatismes sont désactivés par défaut et conservés dans la clé locale dofus-idle-full-v2. Les anciens personnages, équipements, quêtes, succès et inventaires ne sont pas réinitialisés.

### Succès et tests

Le système de succès intègre désormais également des objectifs pour chaque donjon, chaque étape de quête et chaque panoplie récompensée, avec des paliers de donjons et collections. Les identifiants des 22 382 succès d'origine restent inchangés ; les nouveaux objectifs sont ajoutés sous des identifiants stables.

Le workflow de test continue les tests antérieurs et ajoute tests/adventure-v9.cjs : présence des 57 images dans le dépôt, parcours de 5 salles de la Crypte de Kardorim, boss final, quêtes d'Incarnam, panoplie du Bouftou, titres, automatisation du butin, sauvegarde et nouveaux succès. Les images ont leur propre workflow de reconstruction, dofus-idle-icons-v9.yml.

### Limites

DOFUS IDLE reste un projet fan idle, non un clone technique complet. Les donjons ne reproduisent pas les mécaniques tactiques de chaque boss, les quêtes ne proviennent pas du journal officiel de quêtes, et la fabrication/forgemagie, les PA/PM au tour par tour, le multijoueur et la synchronisation cloud ne sont pas couverts par cette version. Les capacités spéciales affichées et les titres sont propres au prototype. Ne pas confondre les icônes officielles récupérées avec une reproduction des véritables sorts DOFUS.

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
