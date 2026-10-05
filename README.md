# Trieur de médias

Une petite page locale pour **trier des photos et des fichiers** : choisir un dossier, faire défiler en grand, cocher, **envoyer la sélection vers un autre dossier** ou à la **corbeille du système**. Pensé pour trier les sorties d'un générateur d'images : le fichier `.json` jumeau d'une image (réglages ComfyUI) suit l'image partout.

Serveur Python (bibliothèque standard, rien à installer), page HTML/JS sans dépendance, boîte de dialogue GTK pour choisir un dossier. Tout reste sur la machine : le serveur n'écoute que sur `127.0.0.1` et ne sort jamais du dossier personnel.

*English summary at the end.*

## Ce qu'on voit
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

## Installer
Prérequis : Linux (ou macOS) avec **python3 ≥ 3.10** ; pour la boîte « choisir un dossier » : GTK 3 et PyGObject (`python-gobject` sur Arch, `python3-gi` sur Debian) ; pour la corbeille : `gio` (GLib). Sans GTK, on tape le chemin dans la barre ; sans `gio`, la suppression est refusée (rien n'est jamais effacé avec `rm`).

```bash
npx trieur-medias                      # démarre sur http://127.0.0.1:9170 et ouvre le navigateur
npx trieur-medias --port 9180 --no-browser
npx trieur-medias --ouvrir ~/Pictures/photo.png   # s'ouvre sur ce dossier, cette photo affichée
```
Sans npm : `python3 serveur.py --port 9170` dans le dossier du projet.

**En service permanent** (Linux, systemd utilisateur) : copier `trieur-medias.service` dans `~/.config/systemd/user/`, adapter le chemin, puis `systemctl --user daemon-reload && systemctl --user enable --now trieur-medias`.

**« Ouvrir avec » / application par défaut des PNG** : `trieur-ouvrir.sh <fichier>` ouvre le Trieur sur le dossier du fichier (il démarre le service si besoin et ouvre une fenêtre appli du navigateur avec `omarchy-launch-webapp`, à remplacer par `xdg-open` ailleurs qu'Omarchy). Un lanceur `.desktop` avec `Exec=…/trieur-ouvrir.sh %f` et `MimeType=image/png;` puis `xdg-mime default <lanceur>.desktop image/png` en fait l'application par défaut.

## API HTTP (tout en local)
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

## Garde-fous
- Tout chemin est résolu puis **vérifié dans le dossier personnel** (`chemin_sur`) ; sinon 403.
- Les `POST` sont refusés si l'en-tête `Origin` n'est pas l'adresse locale du Trieur.
- **Jamais `rm`** : la suppression passe par la corbeille du système, récupérable. **Jamais d'écrasement** à l'envoi : un fichier du même nom à l'arrivée = refus.
- Le `.json` jumeau (même nom que l'image) suit l'image à l'envoi et à la corbeille.
- Fichiers et dossiers cachés ignorés ; 500 fichiers par opération au plus.

## Schéma et documentation
`docs/architecture.html` : le schéma (navigateur ↔ serveur ↔ dossier personnel / corbeille / boîte GTK), les flux « envoyer » et « corbeille », les limites. `CHANGELOG.md` pour les versions, `PUBLISHING.md` pour publier.

## Licence
MIT — Cyril M. Code : https://github.com/CryptoDjam/trieur-medias

---

## English
**Trieur de médias** (“media sorter”) is a tiny local web page to sort photos and files: pick a folder, scroll full-size, tick, **move the selection to another folder** or to the **system trash**. Built for sorting image-generator output: an image's `.json` sidecar (ComfyUI settings) follows it everywhere.

Python standard library server (nothing to install), dependency-free HTML/JS page, GTK folder-picker dialog. Everything stays on your machine: the server listens on `127.0.0.1` only and never leaves your home directory.

- Run: `npx trieur-medias` (opens http://127.0.0.1:9170), `--port`, `--no-browser`, `--ouvrir <file|folder>`.
- Needs python3 ≥ 3.10; GTK 3 + PyGObject for the folder dialog; `gio` for the trash. Linux (and macOS without the GTK dialog).
- Keys: arrows, Space (tick), A/N (all/none), E (move to…), Delete (trash), Home/End.
- Safety: paths confined to `$HOME`, local-origin `POST`s only, never `rm`, never overwrite, `.json` sidecar moves with its image.
- HTTP routes and the architecture diagram: see the French sections above and `docs/architecture.html`.

MIT — Cyril M.
