# HANDOVER.md — Passation du projet DF-boosting (à lire après AI_STUDIO.md)

Dernière mise à jour : 2026-10-06 (fin de session). Étapes 1 et 2 faites, étape 3 à faire. Propriétaire : BTK (français, mots simples, réponses COURTES).

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
| Serveur déployé | **`df-api` version 6** (déployée le 2026-10-06 ~23:00 UTC sur le projet Supabase `ljorjzrxkxqacmmkmqdx` « Replay », `verify_jwt` = false). Contenu = fichier du repo `supabase/functions/df-api/index.ts` : motifs de refus (inscription, mot de passe, profil), messages d'état à la connexion, purge des refus de plus de 30 jours. **Pas encore testée en situation réelle** (aucun appel dans les journaux juste après le déploiement). Retour arrière : redéployer le fichier du commit `4b20c8b` (v5) |
| Dernier état | Lire `git log` : au 2026-10-06, `main` = commit `35b2b94` (barre du haut sombre en mode sombre). Toujours builder un clone propre de `main` avant de conclure |

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

## 3 ter. Liste de BTK du 2026-10-06
Rien n'a été testé à l'écran par Claude (seulement build + tests de rendu locaux). BTK doit tester.

**FAIT**
- Étape 1 : bug avances (`37f50cb`), motif de rejet (`4202d90`), Accueil + grille fusionnés (`3eda6db`), une section par page (`8110821`), page Validations avec filtres (`ce86682`), radar sécurité sur sa page (`b40de5a`).
- Étape 2 : barre du haut fixe claire + recherche globale + cloche (`761454a`, `src/components/TopBar.tsx`), fenêtre de notifications (`a8e2fef`, `src/utils/notifications.ts`), bip + réglage du son dans Réglages, bouton Son pour le booster (`0fcc0a3`, `src/utils/notifSound.ts`).
- Après l'étape 2 : barre du haut qui suit le thème (`35b2b94`) ; fiche complète d'un booster ouverte depuis la recherche (`5836bde`, `src/views/admin/BoosterPage.tsx`, liens profil/calendrier/messagerie/historique/postes/sécurité) ; page Historique avec recherche + filtres type/statut/booster/période (`src/views/admin/HistoryPage.tsx`, menu admin « Historique », lien depuis la fiche booster). Limite : inscriptions et mots de passe déjà traités ne laissent aucune trace (le serveur les supprime), seules celles en attente apparaissent.
- Paie estimée du panneau de validation = prix du 1M des Réglages (`c344dd2`). JS principal 585 Ko → 300 Ko, pages chargées à la demande (`922c836`). Pastille « Photo en cours d'envoi » (`96da0e4`).
- Corrections : `e4aa7ee` (fichier `pendingCount.ts` oublié, le build Vercel échouait), `4aad56d` (texte « 1M = 1 000 Ar » retiré de la connexion).

**PAS FAIT** (par ordre de priorité ; chaque point attend le « GO » de BTK)
1. **Tester `df-api` v6** : refuser une inscription, un mot de passe oublié et un profil avec motif ; le booster doit voir le motif (profil : sur sa page ; inscription et mot de passe : message à la connexion). Si cassé : retour arrière (voir « Serveur déployé »).
2. **Barre du haut sombre** : corrigée dans `35b2b94`. Vérifier que le déploiement est READY et que BTK recharge la page (cache).
5. **Étape 3 : vitesse du site** : photos de preuve lentes (compression + barre de progression avec `compressProofImage`), découper le gros JS (> 500 Ko, `import()` dynamique), moins de rechargements, éviter les rendus inutiles des 20 cartes.
6. **Anti-spam des inscriptions** : limite par jour et par téléphone (aujourd'hui seulement une demande en attente par pseudo et un plafond de demandes en attente).
8. **Code mort à supprimer** : `src/components/Navbar.tsx` (jamais importé, contient encore le texte « Affiche HD ») et la fonction `generateDeltaForcePoster` dans `src/utils/imageUtils.ts`.
9. **Petits défauts** : « 1 avances » (carte Accueil) ; sous-titre « Contrôle & validations » du menu Suivi des Sessions (et son chinois) ; clic sur une notification n'active pas le bon filtre ; son réglé par appareil (localStorage) ; pas de notification pour la messagerie.

**À TESTER PAR BTK**
Déploiement Vercel = Ready ; pages admin (Accueil, Validations, Surveillance, Employés, Avances, Suivi) ; avance booster → pastille/cloche admin + bip ; refus avec motif ; son (Réglages, iPhone) ; téléphone.

**Pièges appris**
- `git commit -am` n'ajoute pas les fichiers neufs : utiliser `git add -A`, puis builder un clone propre de `origin/main`.
- Vérifier qu'un composant est vraiment utilisé (`grep -rn`) avant de le modifier.
- Connecteur Vercel : 403 sur la liste des déploiements dans une session ; dans une autre, `list_deployments` marche avec `projectId` + `sha`. Sinon BTK vérifie.
- Connecteur Supabase : il peut renvoyer « FGA Authentication Error. Unauthorized » de façon passagère. Réessayer ; sinon BTK le reconnecte (Paramètres > Connecteurs).
- Quand une autre session pousse en même temps, `git push` est refusé : `git fetch`, relire ce qui a changé, ne jamais forcer, ne pas refaire un travail déjà présent sur `main`.

## 3 quater. Plan en 3 livraisons (demandé par BTK le 2026-10-06 : à lire en premier)
Un seul Claude travaille à la fois. Faire `git pull` avant tout. Recap court puis « GO » de BTK avant chaque livraison. Hypothèses confirmées par BTK : 50 postes = 20 actuels + 20 nouveaux (comptes et objectifs différents, noms chinois possibles) + 10 « sans compte » ; alertes admin à 15 puis 30 min ; épingler / supprimer un message par l'auteur ou l'admin.

**Livraison 1 — postes, preuves, historique des avances (site seulement, pas de redéploiement du serveur) — FAITE le 2026-10-06 et poussée sur `main` (commit `8f0b830`), à tester par BTK.** 50 postes en base (20 + 20 nouveaux + 10 `no_account`) ; `addContract` / `removeContract` dans `store.ts` ; `LightboxModal` réécrite (pincement, molette, double-tap, `gallery`) ; `AdvanceHistory.tsx` (admin et booster). Non testé à l'écran.
1. Postes : l'admin ajoute et retire des postes (max 100 ; on ne retire pas un poste avec une session en cours). Poste « sans compte » : grisé, non réservable, rempli par l'admin quand le compte arrive. Fond de la carte selon le Reste : < 21M vert vif, 21M à 51M ambre, au-dessus normal. Les textes « 20 postes » deviennent dynamiques (nombre réel).
2. Preuves : zoom au pincement, à la molette et au double-tap, avec déplacement ; boutons précédent / suivant entre les preuves d'une même session.
3. Historique des avances (admin et booster) : recherche (nom, motif) + filtres (statut, mois, booster, montant) + totaux par statut.

**Livraison 2 — messagerie et descriptions (redéploiement de `df-api` nécessaire)**
4. Messagerie : images ouvertes dans l'appli (zoom, retour, précédent / suivant), fichiers cliquables, épingler, supprimer pour tous, modifier un message envoyé (mention « modifié »), appui long ou menu comme WhatsApp / Telegram.
5. Règle sur les descriptions et motifs : le booster peut ajouter une « Description (facultatif) » sur toutes ses demandes (début de session, avance, profil, mot de passe oublié, inscription ; fin de session = champ « Notes » existant). Refus admin = motif obligatoire (vérifier début et fin de session). Approbation admin = description facultative, visible par le booster et dans l'Historique. Vaut aussi pour tout nouveau formulaire.
6. Anti-spam des demandes : déjà en partie fait (commit `67d4c84`), à vérifier.

**Livraison 3 — présence, « Sans poste », file d'attente (redéploiement de `df-api` nécessaire)**
7. En ligne et statuts : sans signe de vie ~90 s et sans session en cours = hors ligne ; un booster avec session en cours reste « actif » même s'il quitte le site ; statuts admin : En poste / Connecté sans poste / Sans poste (en attente) / Hors ligne ; temps de connexion du jour compté dès la connexion.
8. « Sans poste » et file d'attente : bouton pour le booster ; l'admin voit la file (position, temps d'attente) ; le 1er est notifié quand un poste se libère ; il sort de la file quand il prend un poste.
9. Alertes admin à 15 puis 30 min sans poste.
10. Économie d'appels : interroger le serveur toutes les 15 à 30 s (aujourd'hui 5 s) avec le ping groupé dans la même requête ; sinon 80 boosters dépassent le plan gratuit (~500 000 appels / mois, à vérifier sur la page des tarifs Supabase).

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
3. Rien d'autre côté Vercel : le déploiement est automatique à chaque push sur `main` (on pousse toujours directement sur `main`, jamais sur `design`).
4. Les mots de passe des comptes de test : à demander à BTK, jamais à écrire dans le repo.
5. BTK doit **supprimer l'ancien token** sur https://github.com/settings/tokens et en créer un nouveau (`repo`, 7 jours) pour la session suivante.
