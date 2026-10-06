# Media Sorter (trieur-medias)

A tiny **local web page to sort photos and files**: pick a folder, scroll full-size, tick, **move the selection to another folder** or to the **system trash**. Built for sorting image-generator output: an image's `.json` sidecar (ComfyUI settings) follows it everywhere.

Python standard-library server (nothing to install), dependency-free HTML/JS page, GTK folder-picker dialog. Everything stays on your machine: the server listens on `127.0.0.1` only and never leaves your home directory.

## Quick start
```bash
npx trieur-medias                      # http://127.0.0.1:9170, opens the browser
npx trieur-medias --port 9180 --no-browser
npx trieur-medias --ouvrir ~/Pictures/photo.png   # opens on that folder, that photo shown
```
Without npm: `python3 serveur.py --port 9170` in the project folder.

Requirements: Linux (or macOS) with **python3 ≥ 3.10**; GTK 3 + PyGObject (`python-gobject` on Arch, `python3-gi` on Debian) for the folder dialog; `gio` (GLib) for the trash. Without GTK you type the path; without `gio`, deletion is refused (nothing is ever removed with `rm`).

## What you get
- **Bar**: parent folder, path, "Open…" (dialog), shortcuts, **type filter** (all / photos / videos / texts / others).
- **Thumbnail strip** on the left (subfolders first), **large view** in the middle (image, playable video, raw text, otherwise name and size).
- **Actions**: All, None, **Move to…** (moves the selection with its `.json` sidecar, never overwrites), **Delete selection** (trash, with confirmation).

| Key | Action |
|---|---|
| ← → ↑ ↓ | previous / next file |
| Space | tick / untick the shown file |
| A · N | tick all · untick all |
| E | move the selection to a folder |
| Delete | send the selection to the trash (Enter confirms, Esc cancels) |
| Home · End | first · last file |

## Run as a service / "Open with"
- **Always on** (Linux, user systemd): copy `trieur-medias.service` into `~/.config/systemd/user/`, adjust the path, then `systemctl --user daemon-reload && systemctl --user enable --now trieur-medias`.
- **"Open with" / default app for PNG**: `trieur-ouvrir.sh <file>` opens the sorter on the file's folder with that file shown (starts the service if needed; uses `omarchy-launch-webapp` on Omarchy, replace with `xdg-open` elsewhere). A `.desktop` launcher with `Exec=…/trieur-ouvrir.sh %f` and `MimeType=image/png;` plus `xdg-mime default <launcher>.desktop image/png` makes it the default.

## HTTP API (local only)
| Route | Role |
|---|---|
| `GET /` `/app.js` `/style.css` | the page |
| `GET /api/dossier?chemin=` | folder contents: subfolders, files (name, path, type, size, date) |
| `GET /api/fichier?chemin=` | the file (image / video as is, text as `text/plain`, 400 KB max) |
| `GET /api/raccourcis` | folders offered in the "shortcuts" list |
| `GET /api/choisir?depuis=&titre=` | opens the GTK folder dialog, returns `{chemin}` or `{annule}` |
| `POST /api/deplacer` `{chemins, dossier}` | moves files (+ an image's `.json` sidecar) into `dossier`; refuses an existing name |
| `POST /api/corbeille` `{chemins}` | sends to the trash (`gio trash`), `.json` sidecar included |
| `GET/POST /api/notes?dossier=` | the folder's `notes.json` (reserved for per-media message lists) |

Open the page with `?dossier=…&fichier=…` to land on a file (the address is then cleaned).

## Safety
- Every path is resolved and **checked to be inside the home directory**; otherwise 403.
- `POST`s are refused unless the `Origin` header is the sorter's own local address.
- **Never `rm`**: deletion goes through the system trash. **Never overwrite** on move: an existing name at the destination means refusal.
- The `.json` sidecar (same name as the image) follows the image on move and on trash.
- Hidden files and folders ignored; at most 500 files per operation.

## Docs
`docs/architecture.html`: the diagram (browser ↔ server ↔ home folder / trash / GTK dialog), the "move" and "trash" flows, limits. `CHANGELOG.md` for versions, `PUBLISHING.md` to publish.

## License
MIT — Cyril M. Code: https://github.com/CyberServices-ai/trieur-medias

---

## Français

Une petite page locale pour **trier des photos et des fichiers** : choisir un dossier, faire défiler en grand, cocher, **envoyer la sélection vers un autre dossier** ou à la **corbeille du système**. Pensé pour trier les sorties d'un générateur d'images : le fichier `.json` jumeau d'une image (réglages ComfyUI) suit l'image partout.

Serveur Python (bibliothèque standard, rien à installer), page HTML/JS sans dépendance, boîte de dialogue GTK pour choisir un dossier. Tout reste sur la machine : le serveur n'écoute que sur `127.0.0.1` et ne sort jamais du dossier personnel.

### Ce qu'on voit
- **Barre** : dossier parent, chemin, « Ouvrir… » (boîte de dialogue), raccourcis, **filtre par type** (tout / photos / vidéos / textes / autres).
- **Bande de vignettes** à gauche (sous-dossiers en premier), **vue grande** au centre (image, vidéo lue, texte brut, sinon le nom et la taille).
- **Actions** : Tout, Rien, **Envoyer vers…** (déplace la sélection, avec le `.json` jumeau, jamais d'écrasement), **Supprimer la sélection** (corbeille, avec confirmation).

| Touche | Action |
|---|---|
| ← → ↑ ↓ | fichier précédent / suivant |
| Espace | cocher / décocher le fichier affiché |
| A · N | tout cocher · tout décocher |
| E | envoyer la sélection vers un dossier |
| Suppr | envoyer la sélection à la corbeille (Entrée confirme, Échap annule) |
| Début · Fin | premier · dernier fichier |

### Installer
Prérequis : Linux (ou macOS) avec **python3 ≥ 3.10** ; pour la boîte « choisir un dossier » : GTK 3 et PyGObject (`python-gobject` sur Arch, `python3-gi` sur Debian) ; pour la corbeille : `gio` (GLib). Sans GTK, on tape le chemin dans la barre ; sans `gio`, la suppression est refusée (rien n'est jamais effacé avec `rm`).

```bash
npx trieur-medias                      # démarre sur http://127.0.0.1:9170 et ouvre le navigateur
npx trieur-medias --port 9180 --no-browser
npx trieur-medias --ouvrir ~/Pictures/photo.png   # s'ouvre sur ce dossier, cette photo affichée
```
Sans npm : `python3 serveur.py --port 9170` dans le dossier du projet.

**En service permanent** (Linux, systemd utilisateur) : copier `trieur-medias.service` dans `~/.config/systemd/user/`, adapter le chemin, puis `systemctl --user daemon-reload && systemctl --user enable --now trieur-medias`.

**« Ouvrir avec » / application par défaut des PNG** : `trieur-ouvrir.sh <fichier>` ouvre le Trieur sur le dossier du fichier (il démarre le service si besoin et ouvre une fenêtre appli du navigateur avec `omarchy-launch-webapp`, à remplacer par `xdg-open` ailleurs qu'Omarchy). Un lanceur `.desktop` avec `Exec=…/trieur-ouvrir.sh %f` et `MimeType=image/png;` puis `xdg-mime default <lanceur>.desktop image/png` en fait l'application par défaut.

### API HTTP (tout en local)
| Route | Rôle |
|---|---|
| `GET /` `/app.js` `/style.css` | la page |
| `GET /api/dossier?chemin=` | contenu d'un dossier : sous-dossiers, fichiers (nom, chemin, type, taille, date) |
| `GET /api/fichier?chemin=` | le fichier (image / vidéo telle quelle, texte en `text/plain`, 400 Ko max) |
| `GET /api/raccourcis` | dossiers proposés dans la liste « raccourcis » |
| `GET /api/choisir?depuis=&titre=` | ouvre la boîte GTK « choisir un dossier », renvoie `{chemin}` ou `{annule}` |
| `POST /api/deplacer` `{chemins, dossier}` | déplace les fichiers (+ `.json` jumeau d'une image) dans `dossier` ; refuse un nom déjà présent |
| `POST /api/corbeille` `{chemins}` | envoie à la corbeille (`gio trash`), `.json` jumeau compris |
| `GET/POST /api/notes?dossier=` | `notes.json` du dossier (réservé aux listes de messages par média) |

La page est ouverte avec `?dossier=…&fichier=…` pour arriver directement sur un fichier (l'adresse est ensuite nettoyée).

### Garde-fous
- Tout chemin est résolu puis **vérifié dans le dossier personnel** (`chemin_sur`) ; sinon 403.
- Les `POST` sont refusés si l'en-tête `Origin` n'est pas l'adresse locale du Trieur.
- **Jamais `rm`** : la suppression passe par la corbeille du système, récupérable. **Jamais d'écrasement** à l'envoi : un fichier du même nom à l'arrivée = refus.
- Le `.json` jumeau (même nom que l'image) suit l'image à l'envoi et à la corbeille.
- Fichiers et dossiers cachés ignorés ; 500 fichiers par opération au plus.

### Schéma et documentation
`docs/architecture.html` : le schéma (navigateur ↔ serveur ↔ dossier personnel / corbeille / boîte GTK), les flux « envoyer » et « corbeille », les limites. `CHANGELOG.md` pour les versions, `PUBLISHING.md` pour publier.

### Licence
MIT — Cyril M. Code : https://github.com/CyberServices-ai/trieur-medias
