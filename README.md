# Delta Force Operations - Plateforme de Gestion de Boosting (20 Postes)

Application autonome de gestion des opérations de boosting Delta Force avec suivi des 20 postes en grille 2x10 (tablette de chocolat), validation des sessions par l'administrateur, upload de preuves (1 à 4 photos/captures ou caméra) et gestion des shifts.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** (version 18 ou supérieure recommandée)
- **npm** ou **yarn** / **pnpm**

### Installation des dépendances
```bash
npm install
```

### Lancement en mode développement
```bash
npm run dev
```
L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

### Build pour la production
```bash
npm run build
npm start
```

---

## 📋 Fonctionnalités Incluses

1. **Tablette 20 Postes (2×10)** :
   - Affichage en 2 colonnes verticales × 10 rangées (format tablette de chocolat).
   - Informations sur chaque poste : Départ, Actuel, Reste et Cible.
   - Filtres dynamiques : Statut (`Tous`, `⏳ En attente`, `🟢 En cours`, `⚪ Libres`) et Shift (`Jour`, `Nuit`, `Urgent`).

2. **Espace Booster / Employé** :
   - Sélection d'un poste libre.
   - Saisie manuelle du score de début.
   - Envoi de 1 à 4 photos de preuve (caméra en direct ou sélection de fichiers).
   - Les informations du compte (nom client, tag, cible) sont protégées et verrouillées.
   - Soumission directe avec statut `En attente validation Admin`.

3. **Espace Superviseur / Admin** :
   - Mise en évidence visuelle des postes en attente (alerte ambrée animée).
   - Modal d'inspection avec galerie complète des photos soumises par le booster (zoom plein écran Lightbox).
   - Validation ou rejet de la session avec motif.
   - Contrôle total pour modifier toutes les données d'un poste (nom client, tag, score de départ, cible, shift, assignation du booster).

4. **Stockage & Autonomie** :
   - Persistance locale réactive (`localStorage`).
   - Architecture full-stack Express + Vite prête pour le déploiement sur VPS, Docker ou Cloud.
