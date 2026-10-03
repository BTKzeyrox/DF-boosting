# Delta Force Operations — Gestion de Boosting

Application de gestion d'équipe de boosting Delta Force : 20 postes (grille 2x10), shifts Jour/Nuit, preuves photo, validation admin, paie (1M score = 1 000 Ar), avances, calendrier, messagerie.

**Stack :** React + Vite + Tailwind, API Vercel (`/api`), base Supabase (tables `df_*`).

## Connexion
Pseudo + mot de passe (pas d'email). Le compte `admin` est créé à la première connexion avec le mot de passe `ADMIN_PASSWORD`. L'admin crée ensuite les employés (pseudo + mot de passe) depuis la page Employés.

## Variables d'environnement (Vercel > Settings > Environment Variables)
| Nom | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` (secrète, serveur uniquement) |
| `SESSION_SECRET` | Longue chaîne aléatoire pour signer les sessions |
| `ADMIN_PASSWORD` | Mot de passe initial de l'admin |

## Déploiement
Importer le repo sur vercel.com/new (preset Vite), ajouter les 4 variables, déployer.

## Développement local
```bash
npm install
npx vercel dev
```
