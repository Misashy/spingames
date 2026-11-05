# Pack Codex — Elden Ring / SpinGames

Archive destinée à être extraite à la **racine** du dépôt `Misashy/spingames`.

| Catégorie | Image fournie | Chemin final |
|---|---|---|
| Défi Difficile | 1 : grand arbre / château | `assets/game-art/elden-ring-wheel-difficile.webp` |
| Défi extrême | 2 : chevalier bleu | `assets/game-art/elden-ring-wheel-extreme.webp` |
| Défi Trool | 3 : logo Elden Ring | `assets/game-art/elden-ring-wheel-defi-trool.webp` |

Images WebP qualité 92, dimensions d'origine conservées. Le moteur Canvas existant applique le cadrage « cover », la découpe par secteurs, l'ombrage et les étiquettes contrastées.

## Procédure

1. Mettre à jour `main` du dépôt, créer une branche de sauvegarde.
2. Extraire `assets/game-art/` et `integrer_elden_ring.py` depuis cette archive, **sans écraser `assets/game.js`**.
3. Lancer `python integrer_elden_ring.py` à la racine du dépôt. Le script applique uniquement le mapping Elden Ring et actualise la version du JS dans sa page HTML.
4. Si le script signale que le code a changé, adapter manuellement le mapping en préservant le moteur le plus récent ; ne jamais remettre un ancien `assets/game.js`.
5. Tester 1, 2 et 3 roues, les modes `once` et `each`, 1 à 5 tirages, les textes et pointeurs, le mobile, puis vérifier Minecraft, Fortnite et SimSpin.
6. Vérifier que les catégories officielles et les sauvegardes ne changent pas, puis commit/push vers `main` uniquement après validation.

Ce pack ne publie rien par lui-même.
