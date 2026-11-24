# Combat tactique V13–V14 — mise à jour 24 novembre 2026

## Nouveaux systèmes actifs
Le moteur `combat-tactics-v13-v14.js` s'exécute avant `game-full.js`. Il ajoute :

- **PA en combat idle :** 6 PA de base (12 maximum avec l'équipement), 1 PA récupéré toutes les 0,75 secondes. Chaque sort coûte 2 à 5 PA selon son type. Les temps de recharge et le lancement manuel restent fonctionnels.
- **PM :** 3 PM de base (6 maximum avec l'équipement), 1 PM récupéré toutes les 5 secondes. Le bouton « Se repositionner » dépense 1 PM et réduit de 45 % le prochain coup normal reçu ; il ne permet pas de se déplacer sur une grille.
- **Résistances des monstres :** valeurs déterministes, dérivées des identifiants et niveaux réels, de 0 à 24 %. Les attaques de base et sorts directs subissent ces résistances. Il s'agit de chiffres propres au prototype, et non des résistances officielles DOFUS.
- **Trois priorités de sorts automatiques :** équilibrée, offensive et survie. Le joueur choisit la politique dans le grimoire, enregistrée comme `tacticalPolicy` dans sa sauvegarde existante.
- **Boss variés :** profil « Lien protecteur » (bouclier à 50 % des dégâts, contre 65 % habituellement), « Tourment élémentaire » (+12 % d'attaque en enrage), ou « Entrave » (−1 PA périodiquement). Les anciennes phases de bouclier et d'enrage sont préservées.
- **Interface :** PA/PM visibles dans le panneau joueur, règles et consommations dans le grimoire, résistances affichées pour la cible.

## Compatibilité
Pas de reset ni de nouvelle clé de sauvegarde. Le format reste `dofus-idle-full-v2`. Les valeurs de ressources tactiques n'existent que dans la sauvegarde du combat, et sont créées lors du premier appel au moteur. Les anciennes zones, salles et donjons en cours sont conservés.

## Vérifications
- Test `tests/combat-tactics-v13-v14.cjs` ajouté au workflow existant.
- Validation syntaxique des deux scripts et vérification des fonctions pures de PA, PM, résistance et esquive.
- Les tests navigateur complets sont à confirmer dans GitHub Actions, y compris les anciens tests V9 et V13–V24.

## Limites
Aucune grille tactique, ni vraie gestion officielle des lignes de vue, des zones d'effet et du placement. Les résistances, les PA/PM continus et les trois profils de boss sont des adaptations idle. Les dégâts périodiques et invocations préexistants n'ont pas reçu la même simulation de résistances que les coups directs.

Branche de sécurité : `backup/dofus-idle-before-v13-v14-tactical-20261124`.