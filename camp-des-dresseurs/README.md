# Camp des Dresseurs — Village Defense (prototype de fan-game 0.1)

Un jeu de gestion et de défense de village inspiré de Pokémon, en HTML, CSS et JavaScript natifs, sans serveur et sans dépendance.

## Démarrage

1. Décompresser le ZIP.
2. Ouvrir `index.html` dans Chrome, Edge ou Firefox.
3. Choisir Bulbizarre, Salamèche, Carapuce ou Pikachu pour démarrer.
4. Sélectionner une installation à gauche puis cliquer sur une parcelle libre.
5. Recruter et entraîner des Pokémon à droite, puis lancer les vagues.

La sauvegarde de partie et la méta-progression utilisent le stockage local du navigateur ; elles sont propres à ce site et à ce navigateur. Ne pas utiliser la navigation privée si vous voulez conserver votre progression.

## Fonctionnalités

- 4 Pokémon de départ et 14 espèces recrutables au total.
- Équipe de 6 Pokémon maximum, entraînement, XP et niveaux.
- 6 bâtiments : jardins de Baies, bornes d'énergie, boutique, Centre Pokémon, dojo et atelier de Poké Balls.
- Ressources (Baies, énergie, Pokédollars, Poké Balls), production en continu, réparation du portail.
- Types d'attaque avec avantages et résistances simplifiés.
- Vagues d'ennemis avec trois boss récurrents (toutes les 5 vagues).
- Capture probabiliste durant les combats, insignes et améliorations permanentes.
- Pauses, x1/x2/x3, sons facultatifs et sauvegarde automatique.

## Commandes

- **1 à 6** : sélectionner une installation.
- **Clic / toucher** : construire sur une parcelle libre.
- **Espace** : pause / reprise.
- **X** : vitesse x1 / x2 / x3.
- **R** : réparer le portail (si vous avez les ressources).
- **C** : tenter une capture pendant une vague (1 Poké Ball).
- **Échap** : annuler le placement.

## Sprites et droits

Les sprites Pokémon ne sont **pas distribués dans le ZIP** : le jeu essaie de les charger en direct depuis les URL publiques des sprites génération 5 de [Pokémon Database](https://pokemondb.net/sprites), puis utilise des icônes de secours si le serveur refuse ou si vous êtes hors ligne. Le jeu lui-même fonctionne alors quand même.

Ce projet est un prototype personnel **non officiel**, sans affiliation avec Nintendo, Game Freak ou The Pokémon Company. Pokémon Database n'est pas titulaire des droits sur les personnages ni leurs sprites. Le fait qu'il s'agisse d'un projet gratuit n'autorise pas la distribution ou la publication des éléments Pokémon ; il faut prendre en compte les droits de leurs titulaires avant de le diffuser.

## Code source

- `index.html` : interface, panneaux, écran d'accueil et écrans de fin.
- `style.css` : graphisme cartoon responsive.
- `game.js` : moteur, carte Canvas, ressources, combats, capture, progression et sauvegardes.

La version est indépendante de Bastion des Brumes, avec ses propres clés de sauvegarde : aucun ancien jeu n'est modifié.

## Hébergement des sprites
Les sprites présents dans `assets/sprites/` proviennent de la collection PokeAPI/sprites. Ils sont hébergés directement sur GitHub Pages. Les personnages Pokémon restent la propriété de leurs ayants droit.
