> # ⛔ STOP — LIS CE FICHIER EN ENTIER AVANT TOUTE ACTION
> Si tu es une IA (AI Studio, Claude, ChatGPT, Gemini, Cursor, Copilot...) : ne modifie rien, ne propose rien, tant que tu n'as pas lu ce fichier jusqu'au bout.
> **Règle d'or :** avant d'écrire du code, fais un court résumé de ton plan et **attends que BTK écrive « GO »**.

# AI_STUDIO.md — Lis ce fichier AVANT toute modification

Ce document explique le projet **DF-boosting** pour qu'un assistant (Google AI Studio ou autre) puisse travailler dessus seul, sans casser le site en ligne.

## 1. Le projet
**Delta Force Operations** : application de gestion d'une équipe de boosting du jeu Delta Force.
- **20 postes** (comptes clients) affichés en cartes sur 2 colonnes.
- **Shifts** : Jour, Nuit, Urgent.
- Un employé prend un poste, envoie 1 à 4 photos de preuve au début et à la fin ; l'admin valide.
- **Paie** : 1M de score = 1 000 Ar. Les avances sur salaire sont gérées dans l'appli.
- Calendrier, messagerie admin ↔ employés, alertes de sécurité, galerie photo, visionneuse de CV.
- Langues : français et chinois. Thème clair / sombre.

## 2. Les rôles
- **admin** : voit tout, valide ou refuse les débuts/fins de poste, gère les employés (création, mot de passe, blocage, suppression), traite les avances, lit les alertes de sécurité.
- **employee** : voit les postes, prend un poste libre, envoie ses preuves, demande des avances, écrit des messages. Il ne peut modifier que ses propres données.

## 3. Où est quoi
| Élément | Où |
|---|---|
| Site (React + Vite + Tailwind) | Repo GitHub `BTKzeyrox/DF-boosting`, branche `main` |
| Hébergement | **Vercel** : le site se republie tout seul à chaque push sur `main` |
| Serveur | **Supabase Edge Function `df-api`** — code dans `supabase/functions/df-api/index.ts` |
| Adresse du serveur | `https://ljorjzrxkxqacmmkmqdx.supabase.co/functions/v1/df-api` |
| Base de données | **Supabase** (projet « Replay ») |

Le site ne parle au serveur que par **`src/db/store.ts`** (une seule porte d'entrée).

## 4. Comment les données circulent
- Le store garde les données en mémoire et les envoie au serveur après chaque modification.
- Toutes les 5 secondes, il récupère les changements des autres utilisateurs.
- Connexion : pseudo + mot de passe vérifiés par le serveur. Le jeton de session est gardé dans le navigateur.
- Le serveur applique les droits : un employé ne peut pas modifier les données d'un autre.

## 5. Les tables Supabase
Chaque table `df_*` contient : `id` (texte), `data` (JSON), `updated_at`.
- `df_users` : comptes (admin et employés)
- `df_posts` : sessions de boosting (début, fin, preuves, statut, paie)
- `df_contracts` : les 20 postes clients
- `df_security_logs` : alertes de sécurité
- `df_advances` : demandes d'avance sur salaire
- `df_messages` : messagerie
- `df_credentials` : pseudo et mot de passe chiffré. **Jamais envoyé au site.**

## 6. Structure du code
- `src/App.tsx` : écran principal et navigation
- `src/db/store.ts` : données + synchronisation avec le serveur
- `src/db/initialData.ts` : les 20 postes de départ
- `src/views/` : `LoginView`, `admin/AdminDashboard`, `admin/EmployeesManagement`, `employee/EmployeeDashboard`, `CalendarView`
- `src/components/` : `PostsGrid20` (cartes des postes), `Sidebar`, `Navbar`, fenêtres (photos, CV, détails du jour)
- `src/utils/i18n.ts` : textes français et chinois

## 7. INTERDIT
- Ne remets **pas** Firebase, Express, `server.ts`, Drizzle, Cloud SQL ni un dossier `api/`.
- N'ajoute **aucune** variable d'environnement : Vercel n'en a pas besoin.
- Ne supprime pas la connexion par pseudo + mot de passe.
- Ne remets pas les boutons « ZIP », « SQL » ou « base de données » dans l'interface.
- N'écris **jamais** de mot de passe, clé ou token dans le code ou dans ce repo.
- Ne change pas les tables Supabase sans l'accord de BTK. Le code de `df-api` peut être modifié dans le repo, mais il doit ensuite être redéployé (voir section 9).

## 8. Comment travailler
1. Récupère d'abord la dernière version depuis GitHub (pull).
2. Travaille sur la branche **`studio`**, pas sur `main`. Vercel crée alors un lien de test sans toucher au vrai site.
3. Vérifie que `npm run build` passe sans erreur.
4. Ne travaille pas en même temps que quelqu'un d'autre sur les mêmes fichiers.
5. Quand c'est bon, la fusion dans `main` se fait seulement après accord du propriétaire (BTK).

## 9. Le serveur `df-api` (Supabase)
Code : `supabase/functions/df-api/index.ts` (Deno, une seule fonction, routes : `login`, `state`, `sync`, `create-user`, `set-password`, `logout`).
- Il n'a besoin d'aucun secret dans le code : Supabase lui fournit `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` automatiquement. La clé de session est calculée à partir de la clé de service.
- **Modifier le fichier dans GitHub ne change PAS le serveur en ligne.** Il faut le redéployer :
  - Soit dans le tableau de bord Supabase : projet « Replay » → Edge Functions → `df-api` → coller le nouveau code → Deploy.
  - Soit en ligne de commande : `supabase functions deploy df-api --no-verify-jwt --project-ref ljorjzrxkxqacmmkmqdx`
- **Garde « Verify JWT » désactivé** : la fonction fait sa propre vérification (jeton de session maison).
- Si une route change, mets à jour `src/db/store.ts` dans le même travail.
- Le compte `admin` existe déjà. Ne remets jamais de mot de passe dans le code.

## 10. Ce qu'il ne peut pas faire seul
- Créer ou changer les tables Supabase : demander à BTK, ou passer par une migration SQL validée par lui.
- Changer le mot de passe de l'admin : fait depuis la page Employés ou par Claude.
- Si une modification demande un nouveau champ de données, la décrire à BTK avant de coder : le serveur doit être adapté et redéployé en même temps.

## 11. Style
- Textes de l'interface courts, en mots simples.
- Rien ne doit être coupé sur téléphone : les textes passent à la ligne.
- Prix et montants : format `XXXX.XX`.
