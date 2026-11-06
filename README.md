# SpinGames 🎮

Des roues interactives et des défis aléatoires, avec **une page dédiée et un thème visuel distinct pour chaque jeu**.

## Catalogue (17 jeux)

- Les Sims 4 — roue SimSpin originale, conservée à l'identique dans `jeux/les-sims-4/index.html` et intégrée à l'espace SpinGames dans `jeux/les-sims-4/lancer.html`
- Minecraft
- Fortnite
- Elden Ring
- Mario Kart
- Risk of Rain 2
- Football Manager
- PUBG
- Apex Legends
- Valorant
- League of Legends
- Overwatch
- Counter-Strike
- Call of Duty: Warzone
- Dota 2
- Deadlock
- Dofus

Genres : Simulation · Battle Royale · Souls · Création & Survie · Action & Aventure · FPS tactique · MOBA · Hero shooter · MMORPG.

## Bibliothèque

Chaque jeu possède une étoile de favoris ; les jeux favoris apparaissent dans la bibliothèque de la page d'accueil. Les favoris des membres connectés sont sauvegardés dans leur profil Supabase. Les favoris des visiteurs restent temporaires dans l'onglet.

## GitHub Pages + Supabase

Le site est publié depuis la branche `main` sur GitHub Pages. Les comptes, la sauvegarde de progression et les statistiques reposent sur Supabase. Pour éviter de casser le service, **ne pas écraser les fichiers `assets/platform.js`, `assets/site-config.js`, `assets/platform.css` ni les tables du projet Supabase par de vieux ZIP**.

Les nouveaux univers sont désormais acceptés dans le schéma Supabase et dans l'enregistrement des lancers. Le document `supabase/INSTALLATION.md` décrit la configuration des comptes.

Adresse du site : https://misashy.github.io/spingames/

## Mise à jour : roues à choix et animations par catégorie

Sur **Minecraft, Fortnite, Elden Ring, Mario Kart, Risk of Rain 2, Football Manager, PUBG et Apex**, la roue affiche maintenant les **choix d'une catégorie**, et non son seul nom. Lorsqu'il y a plusieurs catégories actives, un clic sur « Faire tourner la roue » lance chaque catégorie active successivement. Le pointeur s'arrête sur un choix réellement obtenu.

Chaque catégorie possède, directement dans la liste et dans l'atelier de modification, un réglage de **1 à 5 choix** et un mode d'animation : **« 1 tour »** (tous les choix de la catégorie apparaissent après un seul tour) ou **« Chaque choix »** (la roue tourne une fois pour chaque choix tiré). Les réglages sont sauvegardés dans les mêmes données JSON qu'avant, avec la nouvelle propriété optionnelle `spinMode` (`once` par défaut, `each` pour chaque choix). L'import/export JSON et la sauvegarde Supabase existante continuent de fonctionner, sans migration SQL.

Les illustrations des cartes et des bannières utilisent des copies **rééchantillonnées et légèrement accentuées** dans `assets/game-art/optimized/`, tout en conservant les sources d'origine dans `assets/game-art/`. **Attention :** les images sources mesurent seulement 570 × 320 pixels ; le rééchantillonnage ne remplace pas de vrais visuels haute résolution. Pour obtenir une netteté HD native, remplacer ces sources par des originaux d'au moins 1920 × 1080, puis réoptimiser en WebP.

**Périmètre inchangé :** code de SimSpin pour Les Sims 4, authentification Google/Supabase, statistiques, favoris et structure SQL.


## Profils privés et contenu officiel (novembre 2026)

- Les catégories et défis intégrés dans les pages des jeux sont le contenu officiel de départ pour tous les visiteurs.
- Les visiteurs peuvent tester les modifications sans compte ; les données sont temporaires (`sessionStorage`) et disparaissent normalement après fermeture de l'onglet.
- Les membres connectés disposent de sauvegardes personnelles dans `public.player_progress`, avec contrôle d'accès Supabase (RLS).
- La dernière base officielle (`official_baseline`) permet de recevoir les nouveaux défis officiels sans restaurer les défis supprimés personnellement, pour les jeux qui utilisent `assets/game.js`.
- Les favoris et la roue personnalisée sont synchronisés dans `public.player_profile_data` pour les membres ; les visiteurs utilisent une session temporaire.
- SimSpin conserve son moteur original et charge ses données par l'isolateur `assets/simspin-storage.js` dans la page `lancer.html`.
- Aucun changement de structure SQL n'est nécessaire pour ce déploiement : `official_baseline` existait déjà.
- Avant une modification majeure du contenu officiel, tester les comptes, la déconnexion, les sessions invitées, et les imports/exports JSON sur navigateur.


## Roues simultanées par catégorie

Sur les neuf jeux du catalogue, chaque catégorie cochée avec des choix possède désormais sa propre roue. L'interface adapte la taille et la disposition de 1 à 5 roues (et continue de répartir les catégories supplémentaires en rangées). Au lancement, les roues tournent en parallèle et leur pointeur indique le choix réellement tiré.

Sur les huit jeux partageant `assets/game.js`, les modes de tirage restent compatibles : `once` = un tour révélant plusieurs choix ; `each` = une succession de tours par choix, avec toutes les roues concernées synchronisées à chaque tour. SimSpin garde son moteur de tirage historique et expose les résultats au nouveau composant visuel `assets/simspin-multi.js` depuis `lancer.html`, sans changer ses catégories, ses statistiques ni les sauvegardes.

Les listes de catégories, l'historique et l'isolation invité/compte restent au même format ; aucune migration Supabase n'est requise.
