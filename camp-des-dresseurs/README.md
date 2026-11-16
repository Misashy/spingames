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

## Sprites, animations et droits

- 24 sprites PNG issus de [PokeAPI/sprites](https://github.com/PokeAPI/sprites) restent dans `assets/sprites/` comme secours.
- 24 GIF animés de génération V provenant du même dépôt sont maintenant intégrés localement dans `assets/animated/`.
- Les portraits **et la carte Canvas** chargent prioritairement les GIF locaux, avec repli vers les PNG locaux si une animation échoue.
- Tout le code du jeu et toutes les images sont servis directement par GitHub Pages. Aucune requête vers un serveur de jeu, une API ou un CDN externe n'est nécessaire.

Les personnages et images Pokémon demeurent protégés : la licence du dépôt PokéAPI précise que les images appartiennent à The Pokémon Company. Leur présence sur GitHub ne dispense pas d'avoir les droits adéquats pour une publication.

## Nouveautés alpha 0.2

- Carte panoramique 1 680 pixels de large, déplacement entre le village et la frontière (bouton ou touches A/D).
- Pokémon alliés qui avancent et se replacent, trainées lumineuses, nombres de dégâts et effets de touche.
- Amélioration de chaque bâtiment jusqu'au niveau 3, avec bonus de production, d'attaque ou de soins.
- Expéditions de récolte dans trois zones avec ressources et découverte possible d'espèces.
- Compatibilité des sauvegardes alpha 0.1, sans réinitialisation.

## Code source

- `index.html` : interface, panneaux, écran d'accueil et écrans de fin.
- `style.css` : graphisme cartoon responsive.
- `game.js` : moteur, carte Canvas, ressources, combats, capture, progression et sauvegardes.

La version est indépendante de Bastion des Brumes, avec ses propres clés de sauvegarde : aucun ancien jeu n'est modifié.

## Hébergement
Le dossier `camp-des-dresseurs/` est autonome et fonctionne comme un site statique sur GitHub Pages, sans toucher aux autres pages de `spingames`.
