# DOFUS IDLE — V10, V11, V12

## V10 — Métiers avancés
- File de 20 commandes d'artisanat (quantités 1/10/100), consommation des ingrédients un par un.
- Maîtrise calculée à partir de l'historique réel des recettes : niveaux 0 à 5, bonus de vitesse jusqu'à 20 %.
- Affichage des sources d'ingrédients : récolte, autre métier, ou monstres connus.
- Les métiers et niveaux déjà obtenus sont conservés ; aucun changement des identifiants.

## V11 — Quêtes et collections
- Guides fictifs DOFUS IDLE par région, parcours conseillé Incarnam → Astrub → Amakna → autres régions par niveau.
- Les quêtes enchaînées existantes et leur historique sont conservés, avec accès direct aux missions d'une région.
- Tableau global des découvertes (monstres, régions, panoplies réclamées et donjons terminés).

## V12 — Cloud (intégration à activer)
- Compte email par lien de connexion, via Supabase Auth.
- Trois emplacements par compte ; envoi et restauration manuels.
- Sauvegarde de sécurité locale horodatée avant toute restauration distante.
- Import/export JSON et sauvegarde localStorage restent disponibles.
- Aucune synchronisation invisible ni résolution automatique des conflits.

### Mise en service indispensable
1. Créer un projet Supabase **dédié à DOFUS IDLE** (ne pas réutiliser sans validation la base d'un autre site).
2. Exécuter le SQL `sql/v12_cloud_saves.sql` puis vérifier les règles RLS.
3. Dans Supabase Auth, configurer email et l'URL de redirection GitHub Pages de DOFUS IDLE.
4. Renseigner `cloud-config.js` avec l'URL du projet et sa clé **publishable** (ou anon legacy), jamais la clé secrète.
5. Tester une connexion, un envoi, une restauration et le refus de lecture entre deux comptes distincts.

Le projet Supabase actuellement visible nommé SpinGames est inactif ; cette intégration cloud ne peut pas être considérée opérationnelle avant qu'un projet DOFUS IDLE soit configuré et testé. Le jeu reste fonctionnel sans cloud.

### Prudence
La restauration remplace la sauvegarde locale seulement après confirmation et copie de secours. Lorsqu'un joueur utilise deux appareils, il doit comparer ses parties avant d'écraser un emplacement distant. Le jeu ne synchronise pas les états de combat en temps réel.
