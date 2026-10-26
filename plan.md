# WF Compagnon — Plan de l'application

> App de bureau perso pour Warframe, **sans Overwolf**, centrée sur deux domaines : le **marché** (warframe.market) et les **arbitrages**.
> Stack : Electron (electron-vite), React + TypeScript, Tailwind CSS v4, shadcn/ui.

---

## 1. Vision et périmètre

| Domaine        | Ce que l'app fait                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Arbitrages** | Afficher le planning des arbitrages à venir avec le tier de chaque nœud, prévenir quand un nœud intéressant arrive, enregistrer mes runs (durée, drones, joueurs) à partir de `EE.log`. |
| **Marché**     | Chercher un objet, voir les meilleurs prix d'achat et de vente, suivre l'historique d'un prix, gérer mes propres ordres.                                                                |

**Hors périmètre** (volontairement) :

- ❌ **Inventaire du joueur** : sans Overwolf, il faudrait lire la mémoire du jeu pour récupérer le jeton de session. C'est contraire aux CGU de Digital Extremes et ça expose à un **ban**.
- ❌ **Overlay en jeu** injecté dans le rendu DirectX (même risque). Une fenêtre « toujours au premier plan » reste possible plus tard en mode fenêtré sans bordure.
- ❌ Reconnaissance des récompenses de reliques par capture d'écran et OCR (piste possible pour une v2).

Règle d'or : l'app **ne touche jamais au processus du jeu**. Elle lit uniquement des fichiers que le jeu écrit déjà et des API publiques.

---

## 2. Sources de données

### Arbitrages

| Donnée                                    | Source                                                                  | Format                                                                                                                                                               | Notes                                                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning                                  | `https://browse.wf/arbys.txt`                                           | Une ligne par heure : `1727892000,SolNode64` (timestamp Unix en secondes, identifiant du nœud). Planning **précalculé sur plusieurs années** (~1 Mo, ~34 000 lignes) | Données communautaires. Télécharger au lancement ou une fois par jour avec `If-None-Match` / `If-Modified-Since`, puis ne garder que la fenêtre utile (quelques jours).                  |
| Tier des nœuds                            | `https://browse.wf/supplemental-data/arbyTiers.js`                      | `window.arbyTiers = { SolNode450: "S", … }`, suivi d'un bloc de commentaire                                                                                          | ⚠️ C'est du **JavaScript** : on l'analyse comme du texte, en isolant d'abord le bloc `window.arbyTiers = { … };` puis avec la regex `(\w+):\s*"([SABCDF])"`. On ne l'exécute **jamais**. |
| Nom, planète et type de mission d'un nœud | Données WFCD (`warframe-worldstate-data`, `solNodes.json`) ou browse.wf | JSON `SolNode64 → { value: "Casta (Ceres)", enemy, type }`. Le planning contient aussi des `ClanNode…` et `SettlementNode…`, à couvrir.                              | À embarquer dans l'app, avec la licence de la source.                                                                                                                                    |
| Mes runs                                  | `%LOCALAPPDATA%\Warframe\EE.log`                                        | Journal texte, chaque ligne commence par un temps en secondes depuis le lancement du jeu                                                                             | Voir ci-dessous.                                                                                                                                                                         |

**Lignes repères de `EE.log`** (relevées sur un vrai log) :

| Ligne (extrait)                                                      | Signification                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| `Background.lua: EliteAlertMission at SolNode17 (Neptune - Proteus)` | Arbitrage actuel annoncé par le jeu                     |
| `Net [Info]: Requested mission: {"name":"SolNode17_EliteAlert"}`     | Je lance l'arbitrage → début d'un run                   |
| `GameRulesImpl - changing state from SS_… to SS_…`                   | Changement d'état de la partie (attente, en cours, fin) |
| `AI [Info]: OnAgentCreated /Npc/…DroneAgent…`                        | Apparition d'un drone (Vitus)                           |
| `AI [Info]: OnAgentCreated /Npc/…`                                   | Apparition d'un ennemi                                  |
| `Sys [Info]: Created /Lotus/Interface/EndOfMatch.swf`                | Écran de fin → fin du run                               |

Points d'attention :

- Le jeu **réécrit `EE.log` à chaque lancement**. Si la taille du fichier diminue, on reprend la lecture au début.
- Le fichier peut faire plusieurs Mo : au premier passage on le lit en entier (pour rattraper les runs faits avant le lancement de l'app), ensuite **uniquement la suite** (position mémorisée), jamais tout le fichier à chaque changement.
- Les temps sont relatifs au lancement du jeu. L'heure réelle se calcule à partir de la ligne d'en-tête `Sys [Diag]: Current time: … [UTC: Mon Oct 26 15:26:15 2026]` (début du log) : heure d'un événement = heure UTC de l'en-tête + (temps de la ligne − temps de l'en-tête, ex. `0.165`). Ce format de date n'est pas ISO : le découper explicitement, sans `Date.parse` (résultat dépendant de l'environnement). À défaut, on se rabat sur la date de modification du fichier. Ne jamais utiliser l'heure de lecture : elle est fausse dès que l'app lit un arriéré.
- Les migrations d'hôte rendent un run incomplet : on le marque comme tel au lieu de l'ignorer.

### Marché

| Donnée                   | Source                                   | Notes                                                     |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| Liste des objets         | API warframe.market v2 (`/v2/items`)     | Mettre en cache localement, rafraîchir une fois par jour. |
| Ordres d'un objet        | `/v2/orders/item/{slug}`                 | Public, pas besoin de compte.                             |
| Statistiques de prix     | API v1 (`/v1/items/{slug}/statistics`)   | Pour l'historique. À vérifier : l'endpoint peut évoluer.  |
| Mon profil et mes ordres | `/v2/me`, `/v2/orders/my` (authentifiés) | Nécessite une connexion à mon compte warframe.market.     |

L'API limite le nombre de requêtes par seconde : toutes les requêtes passent par une **file d'attente** (environ 3 requêtes/s au maximum), avec un cache.

---

## 3. Architecture

```
Processus principal (Node)
 ├─ eelog/          → surveille EE.log, émet missionStart, droneSpawn, missionEnd…
 ├─ arbitrations/   → télécharge le planning et les tiers, calcule les rappels
 ├─ market/         → client warframe.market (file d'attente + cache)
 ├─ store/          → sauvegarde des runs et des préférences
 └─ ipc/            → handlers ipcMain.handle, un par action
        │
Preload             → expose une API typée via contextBridge (window.api)
        │
Renderer (React)
 ├─ features/arbitrations/   → planning, filtres, favoris, historique des runs
 ├─ features/market/         → recherche, prix, mes ordres
 └─ components/ui/           → composants shadcn/ui
```

Règles :

- **Toute** la logique qui touche au disque ou au réseau vit dans le processus principal. Le renderer n'a ni `nodeIntegration`, ni accès direct aux fichiers.
- Les types des messages IPC sont définis **une seule fois** (dossier partagé `src/shared/`, à ajouter aux `include` de `tsconfig.node.json` et `tsconfig.web.json`) et importés par le main, le preload et le renderer.
- Le preload n'expose que des méthodes précises (`window.api.arbitrations.getSchedule()`…), jamais `ipcRenderer` lui-même.
- Une seule instance de l'app à la fois (`app.requestSingleInstanceLock()`) : deux instances liraient `EE.log` en double et enregistreraient chaque run deux fois.
- Les parseurs (`EE.log`, `arbys.txt`, tiers) sont des **fonctions pures** (texte → objets), séparées de la lecture de fichier, pour être testables facilement.

---

## 4. Modèle de données

| Type              | Champs principaux                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NodeInfo`        | `nodeId`, `name`, `planet`, `missionType`, `faction`, `tier` (`S`…`F` ou `null`, les données actuelles vont de S à D)                                                                        |
| `ArbitrationSlot` | `startUtc`, `nodeId` (+ `NodeInfo` résolu)                                                                                                                                                   |
| `ArbitrationRun`  | `id`, `nodeId`, `startedAt`, `endedAt`, `durationSeconds`, `dronesSpawned`, `enemiesSpawned`, `players[]`, `hostMigration` (bool), `status` (`in_progress`, `completed`, `aborted`), `notes` |
| `MarketItem`      | `slug`, `name`, `thumb` (vignette : la CSP actuelle `img-src 'self' data:` la bloque, il faudra autoriser l'hôte statique de warframe.market ou servir l'image depuis le main), `tags[]`     |
| `Order`           | `id`, `itemSlug`, `type` (`buy` / `sell`), `platinum`, `quantity`, `user`, `userStatus` (`ingame`, `online`, `offline`)                                                                      |
| `Preferences`     | `favoriteNodeIds[]`, `minTierForAlerts`, `missionTypes[]`, `remindersEnabled`                                                                                                                |

Stockage : fichiers JSON dans `app.getPath('userData')` pour commencer. On passe à SQLite si l'historique des runs devient gros ou si on a besoin de requêtes (statistiques) : de préférence `node:sqlite` (intégré à Node, pas de module natif à recompiler), sinon `better-sqlite3`.

---

## 5. Écrans

### Arbitrages

| Réf. | Écran                   | Contenu                                                                                                                                                   |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | **Planning**            | Prochaines heures : heure locale, nœud, planète, type de mission, faction, badge de tier. L'arbitrage en cours est mis en avant avec un compte à rebours. |
| A2   | **Filtres**             | Par tier, type de mission, faction, favoris uniquement.                                                                                                   |
| A3   | **Favoris et rappels**  | Étoile sur un nœud. Notification Windows X minutes avant un nœud favori ou d'un tier minimum.                                                             |
| A4   | **Historique des runs** | Liste des runs (date, nœud, durée, drones, statut), détail d'un run, notes perso.                                                                         |
| A5   | **Statistiques**        | Drones par minute, durée moyenne par nœud, meilleurs nœuds selon mes runs.                                                                                |

### Marché

| Réf. | Écran                  | Contenu                                                                                                                     |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| M1   | **Recherche**          | Champ de recherche avec autocomplétion sur la liste des objets.                                                             |
| M2   | **Fiche objet**        | Meilleurs prix de vente et d'achat (joueurs en jeu en premier), ordres en tableau, bouton « copier le message de whisper ». |
| M3   | **Historique de prix** | Graphique des prix sur 48 h / 90 jours.                                                                                     |
| M4   | **Mes ordres**         | Liste, création, modification, passage visible/invisible. Nécessite d'être connecté.                                        |
| M5   | **Liste de suivi**     | Objets suivis, alerte si un prix passe sous un seuil.                                                                       |

---

## 6. Sécurité

- **Jeton warframe.market** : chiffré avec `safeStorage` d'Electron (DPAPI sous Windows), jamais en clair sur le disque, jamais dans les logs. Le mot de passe n'est jamais stocké, seul le jeton l'est.
- **Aucun code distant exécuté** : les fichiers téléchargés (`arbyTiers.js` notamment) sont analysés comme du texte.
- **Validation** de toutes les réponses d'API et de toutes les lignes de log (schémas `zod` ou vérifications manuelles) avant usage.
- **Electron** (déjà en place dans le squelette) : `contextIsolation` et `sandbox` activés, pas de `nodeIntegration`, preload qui n'expose que `window.api`, CSP stricte dans `index.html`, navigation de la fenêtre bloquée, liens externes ouverts dans le navigateur **uniquement en `https:`**.
- **Réseau** : liste fermée de domaines appelés (`api.warframe.market`, `browse.wf`) depuis le processus principal uniquement.
- **Respect des services** : file d'attente et cache pour warframe.market, `User-Agent` explicite, en-têtes `Platform` / `Language` attendus par l'API v2, cache pour browse.wf.
- **Connexion warframe.market** : l'authentification utilisée par les outils tiers n'est pas une API publique documentée. Vérifier les conditions d'utilisation du site avant le sprint 4.

---

## 7. Tests

- **Vitest** pour le code pur, mis en place au sprint 1.
- Priorités :
  1. parseur `arbys.txt` et parseur des tiers ;
  2. parseur `EE.log` : des extraits de vrais logs en fixtures (**anonymisés** : pseudos remplacés), un test par événement, plus les cas limites (fichier réécrit, ligne coupée en deux, migration d'hôte) ;
  3. client warframe.market : file d'attente et cache, avec un `fetch` simulé.
- Les composants React restent simples. On ajoute des tests (Testing Library) seulement sur la logique d'affichage qui le justifie (filtres, tri).

---

## 8. Sprints

### ✅ Sprint 0 — Squelette

- [x] Electron + React + TypeScript (electron-vite)
- [x] Tailwind CSS v4 + shadcn/ui, thème sombre
- [x] Coquille avec deux onglets Marché et Arbitrages
- [x] **Livrable :** `npm run dev` ouvre l'app, `typecheck`, `lint` et `build` passent

### ⬜ Sprint 1 — Planning des arbitrages

- [ ] Vitest + dossier `src/shared/` pour les types communs (ajouté aux deux tsconfig)
- [ ] Verrou d'instance unique (`app.requestSingleInstanceLock()`)
- [ ] Parseurs `arbys.txt` et tiers (avec tests)
- [ ] Données des nœuds embarquées (`solNodes.json`)
- [ ] Téléchargement et cache dans le main, API IPC `arbitrations.getSchedule()`
- [ ] Écrans A1 et A2
- [ ] **Livrable :** l'onglet Arbitrages affiche les 24 prochaines heures avec les tiers, filtrables

### ⬜ Sprint 2 — Suivi des runs via EE.log

- [ ] Lecture incrémentale de `EE.log` (fin de fichier, gestion de la réécriture)
- [ ] Parseur d'événements (avec fixtures anonymisées)
- [ ] Machine à états d'un run (début, drones, fin, migration d'hôte)
- [ ] Sauvegarde des runs, écran A4
- [ ] **Livrable :** je fais un arbitrage, le run apparaît dans l'historique avec sa durée et ses drones

### ⬜ Sprint 3 — Prix du marché

Maquette Figma de l'onglet Marché (4 écrans) : « WF Compagnon — Maquette Marché ».

- [x] Onglet Marché et sous-navigation ; écran « Vue d'ensemble » avec des données d'exemple (`src/renderer/src/features/market/`)
- [ ] Client warframe.market (file d'attente, cache, validation)
- [x] Écran « Fiche objet » avec des données d'exemple (courbe de prix, ordres, recommandation, set ou pièces)
- [x] Écran « Meilleures heures » avec des données d'exemple (top 3 des créneaux, carte de chaleur jour × heure, délai de vente, créneaux à éviter)
- [ ] Brancher les écrans sur les vraies données à la place des fichiers `*sample-data.ts` ; enregistrer les relevés horaires (ventes, vendeurs en jeu, délai) jour par jour pour la carte de chaleur
- [ ] Recherche d'objet pour ouvrir sa fiche
- [ ] Liste des objets en cache, écrans M1 et M2
- [ ] Écran M3 (graphique, par exemple avec Recharts)
- [ ] **Livrable :** je cherche « Ash Prime Set » et je vois les meilleurs prix et l'historique

### ⬜ Sprint 4 — Mes ordres

- [ ] Connexion à warframe.market, jeton chiffré avec `safeStorage`
- [ ] Écran M4 (lister, créer, modifier, masquer)
- [ ] Déconnexion et suppression du jeton
- [ ] **Livrable :** je gère mes ordres de vente sans ouvrir le site

### ⬜ Sprint 5 — Confort et packaging

- [ ] Favoris, rappels et notifications Windows (A3)
- [ ] Statistiques des runs (A5) et liste de suivi des prix (M5)
- [ ] Icône, nom et installeur Windows (`npm run build:win`)
- [ ] **Livrable :** un installeur `.exe` utilisable au quotidien

---

## 9. Ordre de développement résumé

```
Squelette → parseurs purs + tests → planning des arbitrages → lecture de EE.log
→ historique des runs → prix du marché → connexion et mes ordres → rappels et packaging
```
