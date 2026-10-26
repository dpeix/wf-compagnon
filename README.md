# WF Compagnon

App de bureau perso pour Warframe, sans Overwolf : prix **warframe.market** et suivi des **arbitrages**.

Stack : Electron (electron-vite), React + TypeScript, Tailwind CSS v4, shadcn/ui.

Ce que fera l'app, son architecture et les étapes de développement : voir [plan.md](plan.md).

## Prérequis

- Node.js 24 (installé avec nvm-windows : lancer `nvm use 24.22.1` une fois, dans un terminal administrateur)
- npm

## Commandes

| Commande                | Rôle                                                  |
| ----------------------- | ----------------------------------------------------- |
| `npm install`           | Installer les dépendances                             |
| `npm run dev`           | Lancer l'app en développement (rechargement à chaud)  |
| `npm run check`         | Format, lint, types, code mort et tests (comme la CI) |
| `npm test`              | Lancer les tests Vitest                               |
| `npm run test:mutation` | Mutation testing avec Stryker (lent)                  |
| `npm run typecheck`     | Vérifier les types TypeScript                         |
| `npm run lint`          | Lancer ESLint                                         |
| `npm run knip`          | Détecter fichiers, exports et dépendances inutilisés  |
| `npm run format`        | Formater le code avec Prettier                        |
| `npm run build`         | Vérifier les types puis compiler dans `out/`          |
| `npm start`             | Lancer la version compilée (aperçu du build)          |
| `npm run build:win`     | Construire l'installeur Windows dans `dist/`          |

## Garde-fous

- **TypeScript strict** (`tsconfig.base.json`) et **ESLint typé** (`strictTypeChecked`).
- **Hooks git** (lefthook, installés par `npm install`) : formatage et lint au commit, types et tests au push.
- **CI** GitHub Actions : audit, format, lint, types, knip, tests, build. Mutation testing sur `main`. Une PR qui modifie un test existant échoue sans le label `tests-approuves`.
- **Claude Code** (`.claude/`) : un test déjà commité ne peut plus être modifié par Claude, les fichiers de garde-fous sont protégés, et chaque fichier édité est formaté et linté.

Les règles détaillées pour l'IA sont dans [CLAUDE.md](CLAUDE.md).

## Ajouter un composant shadcn/ui

```bash
npx shadcn@latest add <composant>
```

Les composants arrivent dans `src/renderer/src/components/ui/`. Si un fichier généré importe `cn` depuis `"cn"`, remplace l'import par `"@/lib/utils"` et désinstalle le paquet `cn` que la CLI a pu ajouter.

## Organisation

```
src/
├── main/       # Processus principal Electron (fichiers, réseau)
├── preload/    # Pont sécurisé entre main et renderer
└── renderer/   # Interface React
    └── src/
        ├── components/ui/   # Composants shadcn/ui (générés)
        ├── lib/utils.ts     # Helper cn()
        └── App.tsx
```
