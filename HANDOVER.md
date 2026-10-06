# HANDOVER.md — Passation du projet DF-boosting (à lire après AI_STUDIO.md)

Dernière mise à jour : 2026-10-06 (fin de session). Étape 1 faite (section 3 ter). Prochain travail : étape 2 (barre du haut) après les tests de BTK. Propriétaire : BTK (français, mots simples, réponses courtes).

## 0. Règles de travail avec BTK
1. Faire un **recap court, puis attendre le mot « GO »** avant de modifier quoi que ce soit.
2. **Push direct sur `main`** (décision de BTK le 2026-10-05 : pas de branche `design`, ça consomme trop de tokens). Chaque push republie le vrai site : un petit changement à la fois, build vérifié avant le push.
3. Mots simples, réponses courtes, en français.
4. Jamais de mot de passe, clé ou token dans le repo ni dans le code.
5. Dire honnêtement ce qui n'a pas pu être vérifié (on ne voit pas l'écran de BTK).
6. **Écrire dans le repo (testé le 2026-10-06)** : le connecteur GitHub est en lecture seule (403 « Resource not accessible by integration » à l'écriture). Il ne faut pas s'en servir pour écrire. On pousse avec `git` dans le terminal, avec le **token classique de BTK** (scope `repo`) qu'il donne dans le chat. Le réseau de la conversation doit autoriser `github.com` et `registry.npmjs.org` (Paramètres > Capacités, puis **nouvelle conversation**). Méthode : cloner le repo, modifier, `npm run build`, `git fetch` puis pousser avec un en-tête HTTP temporaire : `git -c http.extraheader="AUTHORIZATION: basic $(printf 'x-access-token:%s' \"$GH_T\" | base64 -w0)" push origin HEAD:main`. Le token reste dans une variable d'environnement du terminal : jamais dans l'URL du remote, jamais dans un fichier, jamais dans le repo. Toujours `git fetch` avant de pousser (une autre session peut avoir poussé) et ne jamais forcer le push. Demander à BTK de supprimer le token après la session.
7. Supabase (projet « Replay ») et Vercel passent par leurs connecteurs. Vercel héberge le même repo dans 3 projets (`df-boosting-5u7c` = le vrai site, `df-boosting`, `df-boosting-01`) : vérifier le déploiement avec `list_deployments` en filtrant sur le `sha`.

## 1. Architecture (en ligne)
| Élément | Détail |
|---|---|
| Site | React + Vite + Tailwind v4, hébergé sur Vercel : https://df-boosting-5u7c.vercel.app/ (republié à chaque push sur `main`) |
| Serveur | Supabase Edge Function `df-api` (code : `supabase/functions/df-api/index.ts`, `verify_jwt` désactivé) |
| Base | Supabase, projet « Replay » (id `ljorjzrxkxqacmmkmqdx`), tables `df_users`, `df_posts`, `df_contracts`, `df_security_logs`, `df_advances`, `df_messages`, `df_credentials`, + `df_settings` (Réglages), `df_resets` (mots de passe oubliés), `df_profile_requests` (modifs de profil). Fonction SQL `df_rename_employee`. Bucket Storage public `df-files` (10 Mo max) |
| Porte d'entrée du site | `src/db/store.ts` (constante `API_BASE`, synchro toutes les 5 s) |
| Serveur déployé | `df-api` **version 6** annoncée par le commit `4202d90` (motif de rejet obligatoire) ; non revérifiée dans cette session. Version 5 au contrôle précédent (routes : login, forgot, state, sync, create-user, set-password, logout, reset-decision, upload, profile-request, profile-decision, signup, signup-decision). Vérifier la version réelle avec `list_edge_functions` avant tout redéploiement |
| Dernier état | `main` (dernier commit de fonctionnalité : `3eda6db`, Accueil admin + grille fusionnés ; étape 1 de la section 3 ter terminée) (la branche `design` n'est plus utilisée) |

## 2. Fait jusqu'ici
- Connexion pseudo + mot de passe (scrypt) ; comptes `admin`, `kiot`, `toki` (mots de passe : demander à BTK).
- Carte de poste : sans mode de jeu, sans « pts », barre de progression, description du poste, formes carrées, thème clair adouci, fond image + dégradé, icônes Lucide.
- Scores abrégés `20.467M` / `12.5k` (`src/utils/formatUtils.ts`). Cible = Début + Objectif. Début modifiable par l'admin seulement. L'employé vérifie sur sa capture (« Oui, identique » / « Non, différent »). À la validation d'une fin de session, l'Actuel du compte devient le score final.
- Formulaires employé/admin épurés ; téléphone au format `261 34 12 345 67` ; photo de profil obligatoire (employé) ; CV retiré ; confirmations « Es-tu sûr ? » (`ConfirmModal`).
- Calendrier admin : liste de boosters + recherche + filtres (shift, statut, compte client) + résumé du mois.
- Interface française / chinois simplifié : traduction automatique par dictionnaire (`src/utils/zhDict.json` + `zhTranslate.ts`). Les textes oubliés restent en français : ajouter au dictionnaire.

## 3. Livraisons A, B, C : état au 2026-10-06
Tout est poussé sur `main` et déployé côté serveur. **Rien n'a été testé à l'écran par Claude** : seuls le build et des appels API simples (connexion refusée, « mot de passe oublié » avec faux pseudo) ont été vérifiés.

**A — bugs et formulaires (fait)** : fenêtres sur fond sombre et flou (règle CSS globale dans `index.css`) ; déconnexion en un clic (cause : une réponse du serveur arrivée après la déconnexion reconnectait l'utilisateur, corrigé dans `pull()`) ; Accueil d'abord (onglet « Accueil » admin) ; « Mot de passe oublié » + carte URGENT admin ; `ScoreInput` (`20 467 000`, `20.467M`, `12k`) ; photos de preuve compressées (~150 Ko) et envoyées dans Storage, purge auto des sessions terminées après `retention_days` (lancée quand l'admin ouvre l'appli, par lots de 40).

**B — admin (fait)** : Accueil à 4 cartes cliquables ; menu Réglages (`SettingsView.tsx`) : prix du 1M, heures de shift, tolérance, types de poste, règles (affichées en haut de la grille booster), conservation des photos ; « Mode booster » / « Retour admin » dans la barre latérale (l'admin est traité comme un booster, ses postes sont à son nom) ; tri Reste / Objectif ; type de poste modifiable sur la carte. Le prix du 1M est lu dans les Réglages (avant : 1 000 Ar fixe dans le code), valable pour les validations futures seulement.

**C — boosters et messagerie (fait)** : profil booster modifiable via demande validée par l'admin (nom, pseudo, téléphone, photo ; la 1re photo reste directe) ; messagerie `ChatView.tsx` (groupe général + privé admin ↔ booster, photos/PDF/texte 10 Mo) ; données de démo (69 sessions, 9 avances, toutes marquées `demo`, comptes `kiot`, `toki`, `sarah`, dont 3 sessions refusées et 6 contrats à noms chinois) ; calendrier À l'heure / En retard / Absent avec résumé Retards et Jours travaillés ; suppression des données de démo en un clic dans Réglages ; code de simulation retiré de `initialData.ts`. **Hors plan, fait dans une autre session** : inscription des boosters validée par l'admin (`signup`, `signup-decision`, `phoneUtils.ts`), affiche retirée de la page de connexion. (Le commit `cf8c608` de C13/C15 a été fait dans une autre session : relire ce code avant de le modifier.)

## 3 bis. Reste à faire / à vérifier
1. **Tests réels par BTK** : déconnexion, photo de preuve, mot de passe oublié de bout en bout (validation admin puis connexion avec le nouveau mot de passe), modification de profil + validation, envoi de fichier dans la messagerie, mode booster, changement de type de poste, Réglages enregistrés, calendrier retards/absences, suppression de la démo.
2. Relire les textes chinois ajoutés au dictionnaire (traduits par Claude, non relus).
3. Les heures de shift et la tolérance servent au calendrier ; le reste de l'appli (shift « confiné » dans `EmployeeDashboard`) garde peut-être encore des heures codées en dur : à vérifier.
4. Les liens Storage sont publics (noms aléatoires, non listables) : acceptable pour l'instant, à durcir (liens signés) si des preuves sensibles y passent.
5. Les anciennes photos en base64 déjà dans `df_posts` ne sont pas migrées (la base ne contient plus que les données de démo sans photos).

## 3 ter. Liste demandée par BTK le 2026-10-06 : étape 1 FAITE, étapes 2 et 3 à faire
Ordre : étape 1 (faite), puis 2, puis 3. Un changement testé à la fois (BTK dit « GO » entre chaque). Les phrases de l'interface doivent être courtes, sans blabla. **Rien de l'étape 1 n'a été testé à l'écran** (on ne voit pas l'écran de BTK) : seuls `tsc` et `npm run build` ont été vérifiés avant chaque push.

**Étape 1 : pages et validations (FAIT, poussé sur `main`)**
1. **Bug avances** : `37f50cb` (une réponse serveur périmée ne retire plus l'avance envoyée ; synchro immédiate au retour sur l'onglet) + `2539482` (pastille ambre d'avances en attente dans la barre du haut). Les avances sont aussi dans la page Validations. Le serveur n'était pas en cause. **À tester par BTK** : booster envoie une avance, l'admin la voit (pastille + Validations + page Avances).
2. **Motif de rejet** : `4202d90` (inscription, profil, mot de passe, avance ; le booster voit le motif ; `df-api` v6). Le rejet d'un début/fin de session a aussi un champ motif (`rejectPost`, `rejection_reason`) : présent dans le code, non testé.
3. **Accueil admin + grille fusionnés** : `3eda6db`. L'Accueil = 4 cartes cliquables + grille des 20 postes (même fenêtre de gestion de poste). L'entrée « Grille » a disparu du menu admin (le menu booster ne change pas). Dans `AdminDashboard.tsx`, la branche `grid`/`dashboard` affiche `homeCards` puis `PostsGrid20`.
4. **Une section par page** : `8110821`. Employés (`EmployeesManagement`, prop `section="employees"`) ≠ Avances (même composant, `section="advances"`) ; Suivi des Sessions = boosters en ligne + flux en direct ; Accueil = cartes + grille. Le sous-titre du menu « Suivi des Sessions » dit encore « Contrôle & validations » (et son chinois) : à corriger avec l'accord de BTK.
5. **Page Validations** : `ce86682`. Onglet « Validations » du menu admin (`activeView 'validations'`), puces de filtre avec compteurs (Tout, Débuts, Fins, Avances, Inscriptions, Mots de passe, Profils). Compteur commun : `src/utils/pendingCount.ts` (`countPending()`), utilisé par la cloche de la barre du haut, le menu et la carte de l'Accueil.
6. **Radar sécurité sur sa page** : `b40de5a`. Onglet « Surveillance » ; plus sur l'Accueil ; la pastille rouge de la barre du haut l'ouvre.

**Tests à faire par BTK (étape 1)** : chaque page du menu admin montre son propre contenu ; Accueil (cartes + grille, clic sur un poste, valider/refuser/assigner) ; Validations (chaque puce, accepter/refuser avance avec motif, inscription, mot de passe, profil) ; pastille ambre et chiffre ; Surveillance avec une vraie alerte ; mode booster (grille inchangée) ; téléphone.

**Étape 2 : barre du haut fixe**
7. En-tête fixe, positif (clair), avec **recherche globale** (suggestions intelligentes : postes, boosters, comptes clients, pages) et, à côté, l'**icône notification**.
8. Clic sur la cloche : fenêtre avec toutes les notifications ; **chaque notification ouvre sa page**. Compteur sur la cloche.
9. **Notification avec son** (bip court ; bouton pour le couper ; attention aux navigateurs qui bloquent le son avant le premier clic).

**Étape 3 : vitesse**
10. Le site est trop lent, surtout à l'ajout des preuves : doit être fluide sur téléphone bas de gamme comme haut de gamme. Pistes : compression des photos avant l'envoi avec barre de progression (`compressProofImage` existe déjà), découper le gros fichier JavaScript (alerte Vite > 500 Ko), moins de rechargements (synchro toutes les 5 s, `JSON.stringify` à chaque diff), éviter les rendus inutiles des 20 cartes.

**Déjà fait, ne pas refaire** : inscription des boosters validée par l'admin ; affiche officielle retirée de la page de connexion et du site (`75f5448`) ; texte « 1M = 1 000 Ar » retiré de la page de connexion et pied de page centré (`4aad56d`).

**Deux petites corrections proposées et acceptées dans le principe** (attendre le GO ; la 1re est déjà faite) :
- Inscription : limiter le spam (aujourd'hui 50 demandes en attente maximum, un robot peut bloquer les vraies inscriptions) : limite par jour et par numéro de téléphone.

## 4. Calcul d'espace (plan gratuit Supabase : 500 Mo base, 1 Go fichiers, 5 Go transfert/mois, pause après 1 semaine sans activité)
80 boosters × 10 Mo = 800 Mo/mois → base pleine en ~18 jours, fichiers en ~37 jours. Avec photos compressées + stockage fichiers + suppression à 30 jours : ~0,6 Go stable. Pour la production à 80 boosters, conseiller le plan Pro (25 $/mois : 8 Go base, 100 Go fichiers, sans pause).

## 5. Pièges connus
- **Modifier `supabase/functions/df-api/index.ts` dans GitHub ne change pas le serveur en ligne** : il faut le redéployer (outil Supabase `deploy_edge_function`, `verify_jwt` = false, ou tableau de bord).
- Claude ne peut **pas créer de projet Vercel** (erreur 403) : seul BTK importe un repo sur vercel.com/new. Après l'import, tout est automatique.
- Les textes de l'interface sont en français dans le code ; le chinois passe par `zhDict.json`. Tout nouveau texte visible doit être ajouté au dictionnaire.
- Test de bout en bout de l'API sans navigateur : activer l'extension `pg_net` via SQL, appeler `https://ljorjzrxkxqacmmkmqdx.supabase.co/functions/v1/df-api/<login|state|sync…>` avec `net.http_post`, lire `net._http_response`, puis `drop extension pg_net`.
- Après un `deploy_edge_function`, le fichier envoyé doit être le **contenu complet** de `index.ts` : toujours repartir du fichier du repo.
- `df_resets` stocke le nouveau mot de passe déjà chiffré (scrypt) ; ne jamais le renvoyer au navigateur (`password_hash: undefined` dans `state`).
- Un booster ne peut plus changer nom/téléphone/photo directement (serveur : seule la 1re photo est directe). Tout passe par `profile-request`.
- Un jour est « absent » = jour de semaine passé sans session depuis la première session du booster (règle à confirmer avec BTK).

## 6. Ce dont le Claude suivant a besoin
1. **Un token GitHub** pour pousser : jeton **classique** avec la case `repo` (le jeton fin « Contents : Read and write » a été refusé par GitHub), 7 jours maximum. À supprimer par BTK après le travail. Ne jamais l'écrire dans le repo.
2. **Le connecteur Supabase** relié au compte de BTK (aucune clé à copier) : permet SQL, migrations, déploiement de `df-api`, journaux.
3. Rien d'autre côté Vercel : le déploiement est automatique à chaque push sur `main` (branche `design` = lien de test).
4. Les mots de passe des comptes de test : à demander à BTK, jamais à écrire dans le repo.
5. BTK doit **supprimer l'ancien token** sur https://github.com/settings/tokens et en créer un nouveau (`repo`, 7 jours) pour la session suivante.
