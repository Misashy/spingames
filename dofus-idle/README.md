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

## Images DOFUS 3 et données officielles (21 novembre 2026)

**Source :** [ledouxm/dofus-sqlite](https://github.com/ledouxm/dofus-sqlite/releases/tag/v6.0_3.7.14.18), extraction du client DOFUS 3 à la version de jeu 3.7.14.18 (tag d'archive \`v6.0_3.7.14.18\`).

- Référence complète du jeu : [dofus.sqlite](https://github.com/ledouxm/dofus-sqlite/releases/download/v6.0_3.7.14.18/dofus.sqlite) (plusieurs centaines de Mo). Elle reste disponible auprès de sa source et n'est **pas** copiée dans GitHub Pages.
- La commande \`python dofus-idle/tools/import_official_assets.py\` lit les exports complets français \`itemsdata.json\`, \`monstersdata.json\`, \`jobsdata.json\` et \`i18n_fr.json\` et fabrique les **catalogues complets indexés** dans \`assets/database/items.fr.json\`, \`monsters.fr.json\` et \`jobs.fr.json\`.
- Le programme extrait de \`images-item.zip\`, \`images-monster.zip\` et \`images-job.zip\` **uniquement les PNG nécessaires au prototype**. La totalité de la bibliothèque d'images DOFUS 3 est trop volumineuse pour être dupliquée directement dans les fichiers de ce petit jeu statique.
- Les ressources de tous les cinq métiers (bois, céréales, minerais, poissons, plantes), objets de banque, butins et équipement obtiennent leur **image officielle d'objet** lorsque le nom est identifiable de manière univoque dans la base française ; les 24 monstres sont identifiés par **MonsterData.id → gfxId**.
- Pour les vrais **modèles du décor en 3D** (arbres sur la carte, filons de minerais, plants de céréales), les PNG de l'archive \`images-item.zip\` sont **les icônes d'inventaire** et non les modèles interactifs. L'import de ces modèles/animations Unity est un chantier séparé : aucun pictogramme n'est présenté comme un modèle 3D officiel.
- \`assets/manifest.json\` consigne toutes les correspondances, les iconId/gfxId, le fichier d'origine, ainsi que la liste des ressources restées sans image certaine. Celles-ci conservent un pictogramme de secours : **pas de sprite approximatif**.
- L'écran se sert de \`assets/catalog.js\`. Le contenu du catalogue est chargé avant \`game.js\`, sans changer les clés de sauvegarde ni la logique du gameplay.
- L'action GitHub \`.github/workflows/dofus-idle-assets.yml\` construit et valide les fichiers, puis les publie **uniquement** sous \`dofus-idle/assets/\`. Les autres mini-jeux ne sont pas modifiés.

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