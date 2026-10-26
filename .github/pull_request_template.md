## Quoi et pourquoi

<!-- Le besoin, en une ou deux phrases. Lien vers l'étape de plan.md concernée. -->

## Relecture humaine

Ce que les outils ne voient pas :

- [ ] Les tests décrivent **le besoin** (lus avant le code) et couvrent les cas d'erreur et les limites, pas seulement le cas nominal.
- [ ] Aucun test ni fixture existant modifié, ou bien le label `tests-approuves` est posé avec une justification ci-dessous.
- [ ] Chaque `as`, `!`, `eslint-disable` et `@ts-expect-error` est justifié en commentaire.
- [ ] Le preload n'expose que des méthodes précises sur `window.api` (jamais `ipcRenderer`) ; chaque nouveau canal IPC valide ses arguments dans le main.
- [ ] `sandbox` et `contextIsolation` sont intacts, pas de `nodeIntegration` ; la CSP de `index.html` n'est pas élargie sans raison écrite.
- [ ] Les liens externes passent par `isSafeExternalUrl` ; le réseau ne vise que les domaines prévus (`api.warframe.market`, `browse.wf`).
- [ ] Toute donnée externe (réponse d'API, ligne d'`EE.log`, fichier téléchargé) est validée avant usage ; aucun code téléchargé n'est exécuté.
- [ ] Aucun jeton ni donnée personnelle dans les logs ou en clair sur le disque.
- [ ] Une nouvelle dépendance était-elle nécessaire ? Existe-t-elle sous ce nom exact ? Est-elle justifiée dans le commit ?
- [ ] Les `scripts` de `package.json` ou les fichiers de config ont-ils changé ? Si oui, pourquoi ?
- [ ] Je peux expliquer chaque ligne acceptée.
