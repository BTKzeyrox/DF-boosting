# HANDOVER.md — Passation du projet DF-boosting (à lire après AI_STUDIO.md)

Dernière mise à jour : 2026-10-05. Propriétaire : BTK (français, mots simples, réponses courtes).

## 0. Règles de travail avec BTK
1. Toujours faire un **recap court, puis attendre le mot « GO »** avant de modifier quoi que ce soit.
2. Travailler sur la branche `design` (lien de test Vercel). Fusionner dans `main` seulement après « GO ».
3. Mots simples, réponses courtes, en français.
4. Jamais de mot de passe, clé ou token dans le repo ni dans le code.
5. Dire honnêtement ce qui n'a pas pu être vérifié (on ne voit pas l'écran de BTK).

## 1. Architecture (en ligne)
| Élément | Détail |
|---|---|
| Site | React + Vite + Tailwind v4, hébergé sur Vercel : https://df-boosting-5u7c.vercel.app/ (republié à chaque push sur `main`) |
| Serveur | Supabase Edge Function `df-api` (code : `supabase/functions/df-api/index.ts`, `verify_jwt` désactivé) |
| Base | Supabase, projet « Replay » (id `ljorjzrxkxqacmmkmqdx`), tables `df_users`, `df_posts`, `df_contracts`, `df_security_logs`, `df_advances`, `df_messages`, `df_credentials` |
| Porte d'entrée du site | `src/db/store.ts` (constante `API_BASE`, synchro toutes les 5 s) |
| Dernier état | `main` = `design` (commit `ecd862d`) |

## 2. Fait jusqu'ici
- Connexion pseudo + mot de passe (scrypt) ; comptes `admin`, `kiot`, `toki` (mots de passe : demander à BTK).
- Carte de poste : sans mode de jeu, sans « pts », barre de progression, description du poste, formes carrées, thème clair adouci, fond image + dégradé, icônes Lucide.
- Scores abrégés `20.467M` / `12.5k` (`src/utils/formatUtils.ts`). Cible = Début + Objectif. Début modifiable par l'admin seulement. L'employé vérifie sur sa capture (« Oui, identique » / « Non, différent »). À la validation d'une fin de session, l'Actuel du compte devient le score final.
- Formulaires employé/admin épurés ; téléphone au format `261 34 12 345 67` ; photo de profil obligatoire (employé) ; CV retiré ; confirmations « Es-tu sûr ? » (`ConfirmModal`).
- Calendrier admin : liste de boosters + recherche + filtres (shift, statut, compte client) + résumé du mois.
- Interface française / chinois simplifié : traduction automatique par dictionnaire (`src/utils/zhDict.json` + `zhTranslate.ts`). Les textes oubliés restent en français : ajouter au dictionnaire.

## 3. À faire (décisions déjà prises par BTK)
**Livraison A — bugs et formulaires**
1. Formulaires : fond flou et sombre derrière, fenêtre pleine (le texte se mélange avec l'arrière-plan).
2. Déconnexion : un seul « Confirmer » doit déconnecter (aujourd'hui il faut le faire 2 fois).
3. Après connexion : afficher l'**Accueil** d'abord (pas la barre latérale ouverte).
4. Page de connexion : « Mot de passe oublié » → le booster entre son pseudo et le **nouveau mot de passe de son choix** ; demande **URGENTE** sur l'accueil admin ; l'admin valide ou refuse (afficher le téléphone du booster, 1 demande en attente par pseudo, réponse générique pour ne pas révéler quels pseudos existent). Le nouveau mot de passe n'est appliqué qu'après validation.
5. Champs de score : séparateurs automatiques (`20 467 000`) + abréviation en direct ; accepter `20.467M` et `12k`.
6. **Photos : compresser (~150 Ko), stocker dans Supabase Storage (pas en base64 dans `df_posts`), supprimer après 30 jours (réglable).** Constat : un poste pèse ~7,9 Mo en base ; sans ça le plan gratuit sature vite.

**Livraison B — admin**
7. Accueil admin avec cartes cliquables vers leur page : boosters en ligne, validations en attente, score total du jour (sessions finies), shifts complets.
8. Menu Réglages (admin) : prix du 1M (ex. 800 Ar), heures de shift, tolérance de retard, règles, options générales, liste des types de poste.
9. Switch « mode booster » pour l'admin (son propre profil) et retour en admin.
10. Tri des postes : par « Reste » (plus → moins) et par « Objectif » (petit → grand / grand → petit).
11. Type de poste modifiable en haut de la carte : **NO R/C**, **YES R/C**, **RED 9CASE** (liste modifiable dans Réglages).

**Livraison C — boosters et messagerie**
12. Mon profil (booster) : il peut changer nom, pseudo, photo ; **validation admin avant application**. Tout ce que fait un booster doit être validé par l'admin.
13. Supprimer toutes les données de simulation. Créer `kiot`, `toki`, `sarah` (mot de passe demandé à BTK : `sarah124`) avec **1 mois d'historique** marqué `demo` (suppression en un clic) : 6 jours sur 7, avec retards, jours sans poste, sessions refusées, plusieurs demandes d'avance. Le calendrier calcule À l'heure / En retard / Absent ; le résumé ajoute Retards et Jours travaillés.
14. Messagerie : groupe général (tous + admin), conversations privées admin ↔ booster, envoi de photos et fichiers (Supabase Storage, 10 Mo max par fichier).
15. Tester des noms de compte client en chinois sur quelques postes.

## 4. Calcul d'espace (plan gratuit Supabase : 500 Mo base, 1 Go fichiers, 5 Go transfert/mois, pause après 1 semaine sans activité)
80 boosters × 10 Mo = 800 Mo/mois → base pleine en ~18 jours, fichiers en ~37 jours. Avec photos compressées + stockage fichiers + suppression à 30 jours : ~0,6 Go stable. Pour la production à 80 boosters, conseiller le plan Pro (25 $/mois : 8 Go base, 100 Go fichiers, sans pause).

## 5. Pièges connus
- **Modifier `supabase/functions/df-api/index.ts` dans GitHub ne change pas le serveur en ligne** : il faut le redéployer (outil Supabase `deploy_edge_function`, `verify_jwt` = false, ou tableau de bord).
- Claude ne peut **pas créer de projet Vercel** (erreur 403) : seul BTK importe un repo sur vercel.com/new. Après l'import, tout est automatique.
- Les textes de l'interface sont en français dans le code ; le chinois passe par `zhDict.json`. Tout nouveau texte visible doit être ajouté au dictionnaire.
- Test de bout en bout de l'API sans navigateur : activer l'extension `pg_net` via SQL, appeler `https://ljorjzrxkxqacmmkmqdx.supabase.co/functions/v1/df-api/<login|state|sync…>` avec `net.http_post`, lire `net._http_response`, puis `drop extension pg_net`.
- Un jour est « absent » = jour de semaine passé sans session depuis la première session du booster (règle à confirmer avec BTK).

## 6. Ce dont le Claude suivant a besoin
1. **Un token GitHub** pour pousser : jeton **classique** avec la case `repo` (le jeton fin « Contents : Read and write » a été refusé par GitHub), 7 jours maximum. À supprimer par BTK après le travail. Ne jamais l'écrire dans le repo.
2. **Le connecteur Supabase** relié au compte de BTK (aucune clé à copier) : permet SQL, migrations, déploiement de `df-api`, journaux.
3. Rien d'autre côté Vercel : le déploiement est automatique à chaque push sur `main` (branche `design` = lien de test).
4. Les mots de passe des comptes de test : à demander à BTK, jamais à écrire dans le repo.
