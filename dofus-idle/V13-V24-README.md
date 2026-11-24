# DOFUS IDLE — Chroniques des Douze (V13 à V24)

## Objectif et périmètre
Les douze versions ajoutent une couche de progression **idle originale** reliée aux systèmes existants, et **ne reproduisent pas** les règles tactiques officielles. Tout passe par le menu « ⚜️ Extensions V13–V24 », sans changer la clé `dofus-idle-full-v2` ni les statistiques des sauvegardes antérieures.

| Version | Fonction livrée |
| --- | --- |
| V13 Combat | Mode défi optionnel (+35 % dégâts ennemis), éclats de rune selon les victoires (12 % normal / 30 % défi), application des bonus de l'extension aux dégâts et à la défense. |
| V14 Builds | Trois configurations de sorts automatiques sauvegardées par classe, restauration manuelle. Les points de caractéristiques et les équipements ne sont pas réécrits. |
| V15 Forgemagie | Renforcement par identifiant d'équipement, 5 rangs, prix croissant en kamas et éclats. Les bonus ne s'appliquent qu'aux objets équipés. |
| V16 Atlas | Liste des régions et accès direct aux zones réelles du moteur. |
| V17 Boss | Sceaux par victoire finale en donjon, bonus de première victoire et entraînement consommant les sceaux. |
| V18 Familiers | Quatre familiers/montures à adopter, un seul actif, bonus et expérience gagnée lors des combats. |
| V19 Marché | Comptoir simulé achat/revente de ressources réelles, marge empêchant l'aller-retour profitable et vérification des stocks/capacité. |
| V20 Six Dofus | Longs objectifs de niveau, victoires et donjons pour débloquer les six Dofus, bonus offensifs persistants. Ce sont des trophées internes, pas des objets DOFUS officiels de la banque. |
| V21 Artisans | Paliers de 25 exemplaires fabriqués, contrats donnant des jetons de guilde, lien vers la fabrication V10. |
| V22 Dimensions | Quatre expéditions à niveaux croissants, durée réelle 2 minutes, essences et compteurs d'achèvement. |
| V23 Songes | Étages progressifs à lancer, 45 s, vérification de puissance, récompenses en éclats et jetons, aucune mort ni perte de sauvegarde. |
| V24 Guilde | Forge et rempart permanents améliorés avec les jetons de guilde. Guilde **personnelle**, pas de serveur social ou multijoueur. |

## Limitations à connaître
- Ce sont **douze fonctionnalités initiales jouables**, pas douze expansions complètes de DOFUS. Le système de PA/PM, des variantes de sorts complètes, la forgemagie officielle avec jets et échecs, le marché entre vrais joueurs et les Songes tactiques complexes ne sont **pas encore implémentés**.
- Les données des régions, métiers, objets et monstres proviennent des données déjà chargées dans le moteur principal. Les prix, bonus, défis et quêtes de cette extension sont des créations de DOFUS IDLE.
- Les timers V22/V23 s'appuient sur l'heure de l'appareil. La sauvegarde cloud reste **non configurée** tant qu'un backend Supabase dédié n'est pas activé ; les données locales et exportées au format JSON sont conservées.
- Aucune modification de base de données, pas de nouvelle clé de sauvegarde, pas de réinitialisation du personnage.

## Architecture
- `expansion-v13-v24.js` : module de gameplay autonome `window.DOFUS_IDLE_EXPANSION`.
- `expansion-v13-v24.css` : interface responsive.
- `game-full.js` : hooks d'événements victoire, boss, fabrication et calculs de combat ; menu et passage du contexte.
- `tests/v13-v24.cjs` : tests des douze onglets, d'un familier, d'un Dofus, et de l'ancienne sauvegarde.
- `.github/workflows/dofus-idle-smoke.yml` : contrôle syntaxique et nouveaux tests avec la suite existante.

## Sécurité et sauvegardes
La structure `state.expansion` est ajoutée de manière non destructive à l'état existant, chargé par `load()`. Les anciens succès et donjons restent inchangés. Pour revenir en arrière, conserver la branche `backup/dofus-idle-before-v13-v24-20261124`.

Avant une mise en production publique, vérifier les GitHub Actions, une session fraîche, une session ancienne et un test de longue durée (fabrication + combat + sauvegarde/restauration).