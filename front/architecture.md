# Hive.tn Architecture

## Objectif de la refonte

Le projet est maintenant organise autour d'une architecture modulaire, orientee domaine, tout en conservant les routes HTTP et les routes frontend existantes.

La priorite de cette refonte etait :
- ne pas casser les features deja presentes
- garder les points d'entree front et back fonctionnels
- clarifier les responsabilites techniques
- preparer le MVP a evoluer sans re-ecrire l'application

## Vue d'ensemble

```text
opus/
|- backend/
|  |- src/
|  |  |- app.js
|  |  |- server.js
|  |  |- config/
|  |  |- modules/
|  |  |  |- auth/
|  |  |  |- campaigns/
|  |  |  |- comments/
|  |  |  |- admin/
|  |  |  |- support/
|  |  |  |- notifications/
|  |  |  |- payments/
|  |  |  |- pledges/
|  |  |  |- saved/
|  |  |- middlewares/
|  |  |- routes/
|  |  |- shared/
|  |  |- database/
|- front/
   |- src/
      |- app/
      |- modules/
      |  |- auth/
      |  |- campaigns/
      |  |- profile/
      |  |- support/
      |  |- admin/
      |  |- payments/
      |- shared/
      |- assets/
```

## Backend

### Points d'entree

- `src/app.js` configure Express, les middlewares globaux, les uploads statiques et monte `/api`
- `src/server.js` demarre le serveur apres `dbReady`
- `src/routes/index.js` centralise le montage des routes par module

### Modules metier

Chaque domaine principal est expose sous `src/modules/*` :
- `auth`
- `campaigns`
- `comments`
- `admin`
- `support`
- `notifications`
- `payments`
- `pledges`
- `saved`

Les modules les plus avances contiennent deja leur combinaison `controller/model/routes`, et les domaines qui avaient deja une logique de service forte (`payments`, `notifications`, `saved`) sont ranges dans cette structure.

### Middlewares

Les middlewares techniques sont centralises dans `src/middlewares/` :
- `auth.middleware.js`
- `admin.middleware.js`
- `upload.middleware.js`
- `error.middleware.js`
- `notFound.middleware.js`

### Scripts et base de donnees

- `src/database/` accueille la structure de travail pour `migrations`, `queries` et `seeds`
- `backend/scripts/database/init-db.js` remplace l'ancien script racine d'initialisation
- `backend/scripts/admin/upsert-admin.js` regroupe les usages lies a la creation ou promotion d'un admin
- `backend/scripts/tests-manual/` conserve les scripts de verification ponctuels encore utiles hors workflow automatise

## Frontend

### Points d'entree

- `src/app/App.jsx` devient le vrai shell applicatif
- `src/app/routes.jsx` centralise React Router
- `src/main.jsx` monte maintenant `app/App.jsx`

### Organisation par domaines

Les pages principales sont exposees sous `src/modules/*/pages` :
- `auth`
- `campaigns`
- `profile`
- `support`
- `admin`
- `payments`

### Shared

Les briques transverses sont progressivement recentrees dans `src/shared/` :
- `shared/services/api.js`
- `shared/services/httpClient.js`
- `shared/utils/authStorage.js`
- `shared/utils/currency.js`
- `shared/utils/paymentSession.js`
- `shared/components/*`

### Support module

Le support est maintenant explicite dans :
- `modules/support/services/supportApi.js`
- `modules/support/utils/supportUtils.js`
- `modules/support/pages/*`

### Nettoyage applique

- les wrappers frontend devenus inutiles ont ete supprimes
- les composants et pages admin experimentaux non relies au routing ont ete retires
- `dist/` et `node_modules/` ne font plus partie de la logique du repo
- les imports encore actifs pointent vers `app/`, `modules/` ou `shared/`

## Choix d'architecture

### Ce qui a ete privilegie

- modularite simple par domaine metier
- compatibilite maximale sur les routes et les comportements exposes
- zero sur-ingenierie supplementaire
- separation claire entre bootstrapping, routing, logique metier et utilitaires partages

### Ce qui reste volontairement progressif

- certains controllers backend portent encore une partie de la logique metier historique
- la migration vers des imports exclusivement `@/modules/*` et `@/shared/*` peut continuer progressivement sans risque

## Verifications effectuees

- build frontend Vite reussi
- chargement du graphe d'imports backend via `import('./src/app.js')` reussi
- verification syntaxique de `backend/src/app.js` et `backend/src/server.js` reussie

## Prochaine etape recommandee

1. Faire migrer progressivement les fichiers React reels dans `modules/*` au lieu de simples facades.
2. Extraire davantage la logique backend historique des controllers vers des services par domaine.
3. Ajouter une vraie couche de validation (`validators`) module par module quand les flux se stabilisent.
