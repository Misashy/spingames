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

- 24 sprites PNG issus du dépôt [PokéAPI/sprites](https://github.com/PokeAPI/sprites) sont intégrés localement dans `assets/sprites/` et servis directement depuis GitHub Pages, y compris sans service externe.
- Les portraits utilisent, lorsqu'ils sont accessibles, les GIF animés de la génération V du même dépôt hébergé sur GitHub. Si le chargement échoue ou si la connexion est coupée, le jeu affiche automatiquement les PNG locaux.
- La carte et les combats animés sur Canvas utilisent les sprites PNG locaux ; le gameplay ne dépend d'aucun serveur de jeu.

Les personnages et images Pokémon demeurent protégés et leur utilisation exige les droits appropriés. Le dépôt PokéAPI indique explicitement que les images sont © The Pokémon Company : sa licence de distribution ne constitue pas à elle seule une autorisation d'exploiter l'univers Pokémon.

## Code source

- `index.html` : interface, panneaux, écran d'accueil et écrans de fin.
- `style.css` : graphisme cartoon responsive.
- `game.js` : moteur, carte Canvas, ressources, combats, capture, progression et sauvegardes.

La version est indépendante de Bastion des Brumes, avec ses propres clés de sauvegarde : aucun ancien jeu n'est modifié.

## Hébergement
Le dossier `camp-des-dresseurs/` est autonome et fonctionne comme un site statique sur GitHub Pages, sans toucher aux autres pages de `spingames`.
