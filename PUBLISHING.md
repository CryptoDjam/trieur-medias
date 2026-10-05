# Publier trieur-medias (aide-mémoire)

Repris de `~/Projects/hermes-control/PUBLISHING.md` (même compte, mêmes règles).

- Compte npm : `cyberservices-ai`. Une **première** publication d'un paquet neuf, sans jeton « bypass 2FA », part en **staging** (`E_STAGE_REQUIRED` ou `0.0.0-stage`) : Cyril l'approuve sur npmjs.com (téléphone en 4G si le site est bloqué depuis Starlink) → Staged Packages → Approve + code 2FA. Ensuite la version devient `latest`.
- Nouvelle version : `version` dans `package.json`, entrée dans `CHANGELOG.md`, `git commit`, `git tag vX.Y.Z && git push --tags`, puis `npm publish`.
- `npm pack --dry-run` avant de publier : vérifier que seuls les fichiers de `files` partent.
- **Ne jamais dépublier** (24 h de blocage du nom) : `npm deprecate` si besoin.
- Dépôt : https://github.com/CryptoDjam/trieur-medias (créé avec `gh repo create`).

## Historique
- 2026-10-05 : 0.1.0 : `npm publish` a répondu `+ trieur-medias@0.1.0`, mais `npm view trieur-medias version` donne `0.0.0-stage` → le paquet est en **staging**, à approuver par Cyril sur npmjs.com (Staged Packages → Approve + 2FA, téléphone). Dépôt GitHub créé et poussé, tag v0.1.0.
- 2026-10-05 : 0.1.0 passée en `latest` à 15:17 (staging approuvée). 0.1.1 (raccourcis) acceptée à 15:35 mais en staging : à approuver aussi.
