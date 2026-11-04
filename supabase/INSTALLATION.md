# SpinGames — Activation des comptes et statistiques

Le site statique est hébergé sur GitHub Pages. Le fichier `assets/platform.js` gère les trois statistiques (lancers, visiteurs actifs sur les 60 dernières secondes, visiteurs distincts par navigateur) et les comptes.

## 1 — Créer un projet Supabase
Choisir une organisation et une région européenne adaptée au public. Si Supabase demande un coût, confirmer le montant avant création.

## 2 — Installer le schéma
Exécuter le fichier `supabase/schema.sql` dans le SQL Editor Supabase puis vérifier la sécurité et les politiques RLS. Les comptes utilisent `auth.users`, les sauvegardes sont stockées dans `public.player_progress`, et les statistiques privées ne sont exposées que via des fonctions RPC limitées.

## 3 — Configurer l’application Web
Dans `assets/site-config.js`, remplacer uniquement :
- `url` par l’URL HTTPS du projet Supabase (format `https://xxxx.supabase.co`).
- `publishableKey` par la **clé publique** (format `sb_publishable_...`).

**Ne jamais copier la clé secrète/service_role dans le dépôt public ou dans du JavaScript.**

## 4 — Connexion et inscription
Activer le fournisseur e-mail dans Supabase Auth. Configurer l'URL du site :
`https://misashy.github.io/spingames/`

Ajouter dans Auth → URL Configuration les URL de redirection de la racine et des sous-pages du site.

Pour Google :
- créer un client OAuth Web dans Google Cloud,
- configurer son écran de consentement,
- ajouter l’URL de redirection Supabase fournie dans le tableau de bord Auth → Providers → Google,
- saisir Client ID et Client Secret côté Supabase (jamais dans GitHub),
- ajouter l'origine `https://misashy.github.io` dans Google Cloud.

Les utilisateurs non connectés continuent à utiliser les roues avec sauvegarde locale. Après connexion, les catégories et derniers résultats des jeux peuvent être synchronisés. Une éventuelle sauvegarde distante différente sur l’appareil est confirmée avant remplacement.

## 5 — Statistiques
Le compteur `Lancers de roue` est alimenté lors d’un tirage terminé, si la connexion Supabase est active. Le compteur `Joueurs en ligne` mesure les sessions ayant envoyé une présence dans les 60 dernières secondes. Les `Visiteurs au total` sont des navigateurs identifiés par un UUID local, pas des personnes uniques garanties. Les valeurs sont approximatives ; un acteur malveillant peut gonfler ces chiffres malgré la limitation par navigateur.

## 6 — Protection des visiteurs
Avant de lancer publiquement les comptes et statistiques, mettre en place une politique de confidentialité adaptée (durée de conservation, base légale, cookies/stockage local, droits des personnes), une page de contact, et vérifier la sécurité des données et des sauvegardes.

## 7 — Vérifications avant lancement
- Créer un compte avec e-mail et connexion Google (deux navigateurs).
- Confirmer que les sauvegardes de l’utilisateur A ne sont jamais visibles pour B.
- Lancer une roue puis vérifier la hausse du compteur.
- Ouvrir deux navigateurs et vérifier la présence.
- Vérifier les limites de débit, les erreurs réseau et la configuration des redirections.

Documentation :
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security
