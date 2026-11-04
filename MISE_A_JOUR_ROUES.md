# SpinGames — Reprise des roues (novembre 2026)

## Ce qui change
- 8 jeux : les segments de la roue affichent les choix existants de la catégorie visualisée, et non son nom.
- Le clic sur le nom d'une catégorie active permet d'afficher ses choix avant de lancer la roue.
- Chaque catégorie a 1, 2, 3, 4 ou 5 choix par tirage.
- Mode « 1 tour » : un arrêt de roue puis tous les résultats de cette catégorie.
- Mode « Chaque choix » : un arrêt de roue par résultat de cette catégorie.
- Quand plusieurs catégories sont actives, elles passent sur la roue successivement.
- Les choix obtenus restent visibles dans les résultats et l'historique ; les doublons restent gérés selon le réglage déjà présent.
- Paramètre `spinMode` (valeurs `once` ou `each`) ajouté aux catégories JSON, avec `once` par défaut pour les anciennes sauvegardes.
- Les images de cartes et de bannières ont une variante rééchantillonnée de 1710 × 960, légèrement accentuée. Les fichiers 570 × 320 d'origine restent intacts. Ce n'est pas une restauration de détails HD natifs.

## Où sont les modifications ?
- `assets/game.js` : affichage des segments, tirages, deux modes, sauvegardes/import-export.
- `assets/game.css` : réglages visibles à côté de chaque catégorie et liste de choix déroulante.
- `assets/themes.css` + `assets/refresh.css` : orientation vers les images optimisées pour les pages de jeu et les cartes d'accueil.
- `assets/game-art/optimized/` : images rééchantillonnées, avec originales conservées.
- `jeux/*/index.html` (hors Les Sims 4) : une légende et la liste de choix.

## Protection des fonctionnalités existantes
- Aucun changement dans `assets/platform.js`, `assets/platform.css`, `assets/site-config.js`, ni dans `supabase/`.
- Aucun changement dans les pages de jeux Les Sims 4 et SimSpin.
- Aucun changement dans `assets/favorites.*` ou `assets/home.js`.
- Une action « Faire tourner » reste un lancer statistique unique côté Supabase, même si elle fait plusieurs animations.

## Déploiement recommandé
1. Télécharger ou sauvegarder les fichiers actuels de la branche `main`.
2. Tester ce dossier séparément (ou dans une branche / pull request) avant tout remplacement de `main`.
3. Vérifier les 8 jeux, import/export, paramètres locaux, et, sur le vrai site, connexion Google et synchronisation Supabase.
4. Ne pas effacer les données des utilisateurs (localStorage/Supabase).

## Limitation connue
Les images d'origine ne mesurent que 570 × 320. Le traitement les rend un peu plus précises à l'affichage, mais pour une réelle netteté haute définition il faut obtenir les originaux grand format. Les titres très longs ou des listes de plus de 30 choix restent difficiles à lire sur des segments étroits ; la liste déroulante sous la roue affiche alors l'intégralité des libellés.
