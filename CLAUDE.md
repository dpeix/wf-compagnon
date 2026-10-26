# WF Compagnon — instructions pour Claude

App de bureau perso pour Warframe : prix warframe.market et suivi des arbitrages. Le fonctionnel, l'architecture cible et les sprints sont dans [plan.md](plan.md).

Règle d'or : l'app **ne touche jamais au processus du jeu**. Elle lit uniquement des fichiers que le jeu écrit déjà (`EE.log`) et des API publiques.

## Stack et versions

Versions installées (relevées le 26/10/2026). Avant d'utiliser une API, vérifie qu'elle existe **dans cette version majeure** : ne mélange pas avec la syntaxe d'une version antérieure.

| Paquet                                | Version            | Rôle                                   | Piège à éviter                                                                                                                                             |
| ------------------------------------- | ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node                                  | 24.22.1 (`.nvmrc`) | Runtime de dev et de CI                | —                                                                                                                                                          |
| electron                              | 44.9               | App de bureau                          | Garder `sandbox` et `contextIsolation`, jamais `nodeIntegration`, pas de module `remote`.                                                                  |
| electron-vite                         | 6.0                | Build et dev (main, preload, renderer) | Une seule config : `electron.vite.config.ts`. Les assets du main s'importent avec `?asset`.                                                                |
| electron-builder                      | 26.18              | Installeur (`build:win`)               | Tout nouveau fichier de config ou de doc à la racine doit être exclu dans `electron-builder.yml` (`files`).                                                |
| @electron-toolkit/utils               | 4.0                | `is.dev`, `optimizer`, `electronApp`   | —                                                                                                                                                          |
| react / react-dom                     | 19.3               | Interface                              | API React 19 : `ref` est une prop (pas de `forwardRef` dans le code neuf), pas de `defaultProps`. Type de retour des composants : `React.JSX.Element`.     |
| typescript                            | 5.9                | Typage                                 | Ne pas passer à TS 6/7 sans vérifier typescript-eslint (< 6.1) et `@vitest/eslint-plugin`.                                                                 |
| vite                                  | 8.3                | Bundler (via electron-vite)            | —                                                                                                                                                          |
| tailwindcss + @tailwindcss/vite       | 4.3                | Styles                                 | Config **en CSS** (`@import 'tailwindcss'`, `@theme` dans `src/renderer/src/assets/main.css`). Pas de `tailwind.config.js`, pas de directives `@tailwind`. |
| shadcn/ui (style new-york) + radix-ui | radix-ui 1.8       | Composants                             | Paquet unifié `radix-ui` (`import { Slot } from 'radix-ui'`), pas de paquets `@radix-ui/react-*`. Ajout via `npx shadcn@latest add`.                       |
| lucide-react                          | 1.61               | Icônes                                 | —                                                                                                                                                          |
| @fontsource-variable/geist (+ -mono)  | 5.3                | Polices Geist / Geist Mono embarquées  | Importées dans `main.tsx`, branchées via `--font-sans` / `--font-mono` dans `main.css`. Pas de police distante (CSP).                                      |
| eslint                                | 9.39               | Lint                                   | **Flat config** (`eslint.config.mjs`), jamais `.eslintrc`.                                                                                                 |
| typescript-eslint                     | 8.72               | Lint typé                              | Presets `strictTypeChecked` + `stylisticTypeChecked`.                                                                                                      |
| prettier                              | 3.9                | Formatage                              | Sans point-virgule, guillemets simples, 100 colonnes, pas de virgule finale.                                                                               |
| vitest                                | 5.0                | Tests                                  | `import { describe, expect, it } from 'vitest'` (pas de globals).                                                                                          |
| @vitest/eslint-plugin                 | 1.6.27 (épinglé)   | Lint des tests                         | La 1.6.28 exige TypeScript ≥ 6 : ne pas monter tant qu'on est en TS 5.9.                                                                                   |
| @stryker-mutator/core + vitest-runner | 10.1               | Mutation testing                       | —                                                                                                                                                          |
| knip                                  | 6.43               | Code et dépendances inutilisés         | —                                                                                                                                                          |
| lefthook                              | 2.2                | Hooks git                              | Syntaxe `jobs` (lefthook 2).                                                                                                                               |

**Prévus mais pas encore installés** (ne les suppose pas présents ; leur ajout se justifie dans le commit) : zod (validation des données externes), Recharts (graphique de prix), `node:sqlite` (stockage, intégré à Node).

## Architecture

```
src/
├── main/       # Processus principal (Node) : tout accès disque et réseau
├── preload/    # Pont contextBridge : expose window.api, rien d'autre
└── renderer/   # Interface React (alias @/ et @renderer/ → src/renderer/src)
    └── src/
        ├── components/ui/   # Composants shadcn générés (knip les ignore)
        ├── components/      # Composants partagés entre fonctionnalités
        └── features/<nom>/  # Une fonctionnalité : composants, logique pure + tests, types
```

- Dans une fonctionnalité, la logique d'affichage (formatage, calcul de graphiques, tris) est en **fonctions pures** testées (`format.ts` + `format.test.ts`) ; les composants `.tsx` restent minces et n'exportent que des composants.
- Couleurs propres à l'app (en plus des tokens shadcn) : `wf-gold` (accent) et `success` (hausses), définies dans `main.css`. Les baisses utilisent `destructive`.
- Toute la logique qui touche au disque ou au réseau vit dans le **main**. Le renderer n'a accès ni aux fichiers ni à Node.
- Le preload expose des méthodes précises (`window.api.arbitrations.getSchedule()`…), **jamais** `ipcRenderer`. Un canal IPC par action ; le main valide les arguments reçus.
- Les types partagés (messages IPC) iront dans `src/shared/`, à ajouter à l'`include` de `tsconfig.node.json` **et** de `tsconfig.web.json`.
- Les parseurs (`EE.log`, `arbys.txt`, tiers) sont des **fonctions pures** (texte → objets), séparées de la lecture de fichier, avec leur test à côté (`parser.ts` + `parser.test.ts`).
- Le code testable du main ne doit pas importer `electron` (voir `src/main/external-links.ts`). `src/main/index.ts` reste le bootstrap.

## Sécurité Electron

- CSP de `src/renderer/index.html` : ne pas l'élargir sans raison écrite dans le commit.
- Liens externes : uniquement via `isSafeExternalUrl` (`src/main/external-links.ts`), donc https seulement.
- Réseau : liste fermée de domaines (`api.warframe.market`, `browse.wf`), appelés depuis le main uniquement.
- Aucun code distant exécuté : `arbyTiers.js` est analysé comme du texte.
- Jeton warframe.market chiffré avec `safeStorage`, jamais en clair sur le disque ni dans les logs.

## Commandes

| Commande                                              | Rôle                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                                         | Lancer l'app en développement                                                     |
| `npm run check`                                       | format:check + lint + typecheck + knip + tests (à lancer avant de rendre la main) |
| `npm test` / `npm run test:watch`                     | Tests Vitest                                                                      |
| `npm run test:mutation`                               | Stryker (lent, lancé en CI sur `main`)                                            |
| `npm run lint` / `npm run typecheck` / `npm run knip` | Vérifications séparées                                                            |
| `npm run format`                                      | Formater avec Prettier                                                            |
| `npm run build` / `npm run build:win`                 | Compiler / construire l'installeur Windows                                        |

## Garde-fous (à respecter, ne pas contourner)

- **Tests écrits avant le code.** Un test décrit un comportement observable, pas un appel interne ; il couvre au moins un cas nominal, un cas limite et un cas d'erreur.
- **Ne jamais modifier un test ou une fixture déjà commité** (`*.test.ts(x)`, `fixtures/`, `__fixtures__/`). Si un test semble faux, explique pourquoi et attends un accord explicite. Un hook Claude Code le bloque et la CI refuse la PR sans le label `tests-approuves`.
- **Ne pas modifier sans accord explicite** : `.claude/`, `.github/`, `eslint.config.mjs`, `tsconfig*.json`, `vitest.config.ts`, `stryker.config.json`, `knip.json`, `lefthook.yml`, la config Prettier, ni les `scripts` de `package.json`.
- Pas de `any`, `as` ou `!` sans commentaire qui justifie pourquoi c'est sûr. Pas d'`eslint-disable` ni de `@ts-expect-error` sans description.
- Toute donnée externe (réponse d'API, ligne d'`EE.log`, fichier téléchargé) est validée avant usage.
- Pas d'erreur avalée (`catch {}`, ou log puis succès renvoyé quand même). Pas de promesse flottante.
- Toute nouvelle dépendance est justifiée dans le message de commit ; vérifie son nom exact (typosquatting).
- Jamais `--no-verify`, jamais `git push`.

## Conventions

- Commits : Conventional Commits (`feat(ui): …`, `fix: …`, `chore: …`, `docs: …`).
- Commentaires de code en anglais ; textes de l'interface et documentation en français.
- Fonctions avec type de retour explicite (règle ESLint `explicit-function-return-type`).
- Nommage des fichiers tel qu'existant : composant racine `App.tsx`, modules en minuscules (`external-links.ts`, `utils.ts`), composants shadcn en minuscules (`badge.tsx`).
