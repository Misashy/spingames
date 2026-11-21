# DOFUS IDLE — Prototype neuf, style jeu de compétences idle

Prototype **autonome** (indépendant de DOFUS Clicker), conçu pour un hébergement statique sur GitHub Pages. L'interface reprend le principe de Melvor Idle : menu de compétences, cartes de récolte, maîtrise 1–99, progression par métier 1–200, banque, magasin, artisanat et combat automatique.

## Démarrer

Ouvrir `index.html` dans un navigateur, ou utiliser un serveur local :

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Les données sont sauvegardées dans `localStorage` sous la clé `dofus-idle-independent-v1`. Aucune inscription ni connexion n'est requise.

## Contenu inclus

- **5 métiers DOFUS :** Bûcheron, Paysan, Mineur, Pêcheur, Alchimiste ; 40+ activités de récolte.
- **Paliers DOFUS 3** (p. ex. Frêne niveau 1, Châtaignier 20, Noyer 40, Chêne 60 ; Blé 1, Orge 20, Avoine 40, Houblon 60 ; Fer 1, Cuivre 20, Bronze 40, Kobalte 60 ; Ortie 1, Sauge 20 ; Goujon 1, Greuvette 10).
- **Maîtrise** distincte pour chaque ressource, niveau de métier 1 à 200, 1 activité en cours à la fois.
- **Banque :** ressources, vente à l'unité et en masse, objets et équipements.
- **Magasin :** outils, emplacements de banque, dégâts, défense, bonus kamas.
- **Atelier :** six recettes de démonstration avec consommation de ressources et fabrication répétée.
- **Combat :** 24 monstres nommés d'Incarnam et Kardorim, PV, riposte, butin, kamas, équipement et niveaux.
- **4 classes** : Iop, Crâ, Sacrieur, Eniripsa (bonus idle simplifiés).
- **Progrès hors ligne** : récolte/fabrication jusqu'à 8h ; les combats se mettent en pause pour éviter des pertes incontrôlées.
- **Sauvegarde locale** + export/import JSON, et interface adaptée aux écrans mobiles.

## Véracité des données et limites

Les **noms d'espèces** et les premiers **paliers de récolte** reprennent les données DOFUS 3. Les chiffres de gameplay (XP de métiers, temps de récolte, PV, dégâts, chances de butin, prix, composants et bonus des recettes) sont des valeurs **originales du prototype**, pas les valeurs officielles. Certaines recettes ont volontairement été simplifiées, et les noms d'objets peuvent être authentiques mais ne garantissent pas leurs composants officiels. Les autres classes/équipements/professions pourront être intégrés après validation.

Sources de référence de données consultées (novembre 2026) :
- https://hantofix.com/ressources/
- https://hantofix.com/metiers/bucheron/
- https://hantofix.com/metiers/paysan/
- https://hantofix.com/metiers/mineur/
- https://hantofix.com/metiers/pecheur/
- https://hantofix.com/metiers/alchimiste/

**Sprites :** si le prototype est publié comme répertoire frère du DOFUS Clicker existant, il essaie d'afficher les portraits présents dans `../dofus-clicker/assets/monsters/<id>.png`. S'ils n'existent pas ou en local dans le ZIP, des pictogrammes de secours sont affichés. Aucun code ni sauvegarde de DOFUS Clicker n'est repris.

**Droits :** avant toute distribution publique d'éléments graphiques DOFUS, s'assurer que l'autorisation détenue couvre cette utilisation. Le prototype est fourni sans redistribution de nouveaux assets DOFUS.