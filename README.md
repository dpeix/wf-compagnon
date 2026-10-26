# WF Compagnon

App de bureau perso pour Warframe, sans Overwolf : prix **warframe.market** et suivi des **arbitrages**.

Stack : Electron (electron-vite), React + TypeScript, Tailwind CSS v4, shadcn/ui.

Ce que fera l'app, son architecture et les étapes de développement : voir [plan.md](plan.md).

## Prérequis

- Node.js 24 (installé avec nvm-windows : lancer `nvm use 24.22.1` une fois, dans un terminal administrateur)
- npm

## Commandes

| Commande            | Rôle                                                 |
| ------------------- | ---------------------------------------------------- |
| `npm install`       | Installer les dépendances                            |
| `npm run dev`       | Lancer l'app en développement (rechargement à chaud) |
| `npm run typecheck` | Vérifier les types TypeScript                        |
| `npm run lint`      | Lancer ESLint                                        |
| `npm run format`    | Formater le code avec Prettier                       |
| `npm run build`     | Vérifier les types puis compiler dans `out/`         |
| `npm start`         | Lancer la version compilée (aperçu du build)         |
| `npm run build:win` | Construire l'installeur Windows dans `dist/`         |

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
