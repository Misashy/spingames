# SpinGames 🎮

Des roues interactives et des défis aléatoires, avec **une page dédiée et un thème visuel distinct pour chaque jeu**.

## Catalogue (9 jeux)

- Les Sims 4 — roue SimSpin originale, conservée à l'identique dans `jeux/les-sims-4/index.html` et intégrée à l'espace SpinGames dans `jeux/les-sims-4/lancer.html`
- Minecraft
- Fortnite
- Elden Ring
- Mario Kart
- Risk of Rain 2
- Football Manager
- PUBG
- Apex Legends

Genres : Simulation · Battle Royale · Souls · Création & Survie · Action & Aventure.

## Bibliothèque

Chaque jeu possède une étoile de favoris ; les jeux favoris apparaissent dans la bibliothèque de la page d'accueil. Pour le moment, les favoris sont sauvegardés dans le navigateur (`spingames.favorites.v1`) : pas encore synchronisés entre appareils.

## GitHub Pages + Supabase

Le site est publié depuis la branche `main` sur GitHub Pages. Les comptes, la sauvegarde de progression et les statistiques reposent sur Supabase. Pour éviter de casser le service, **ne pas écraser les fichiers `assets/platform.js`, `assets/site-config.js`, `assets/platform.css` ni les tables du projet Supabase par de vieux ZIP**.

Les nouveaux univers sont désormais acceptés dans le schéma Supabase et dans l'enregistrement des lancers. Le document `supabase/INSTALLATION.md` décrit la configuration des comptes.

Adresse du site : https://misashy.github.io/spingames/
