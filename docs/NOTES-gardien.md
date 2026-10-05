# Trieur de médias (Gardien, 2026-10-04)

Petite page locale pour trier des fichiers : choisir un dossier (dans le dossier personnel), faire défiler en grand, cocher, envoyer la sélection à la **corbeille système** (récupérable). Photos d'abord ; texte affiché en brut ; vidéo lue ; les autres types sont listés sans aperçu. Hors de tout projet : c'est un outil.

- Ouvrir : bouton **Trieur** du tableau de bord ou Super + Espace → « Trieur » (fenêtre appli, sans onglets) ; adresse `http://127.0.0.1:9170`.
- Clavier : ← → défiler · Espace cocher · A tout · N rien · Suppr supprimer (confirmation, Entrée) · Début / Fin.
- Suppression = `gio trash` (jamais `rm`) ; le `.json` jumeau d'une image ComfyUI part avec ; chemins limités à `$HOME` ; POST limités à l'origine locale.
- Service utilisateur `trieur-medias.service` ; code : `serveur.py` (bibliothèque standard), `pages/`.
- Prévu : `notes.json` par dossier (liste de messages par média, phase suivante) ; un type de fichier = une fonction d'aperçu à ajouter dans `app.js`.
- 05/10/2026 : **application par défaut des PNG** (demande de Cyril). `trieur-ouvrir.sh <fichier>` ouvre le Trieur sur le dossier du fichier, ce fichier affiché (`?dossier=…&fichier=…` lu par `app.js`, puis l'adresse est nettoyée). Lanceur caché `~/.local/share/applications/trieur-fichier.desktop` (`MimeType=image/png`), réglé par `xdg-mime default trieur-fichier.desktop image/png`. Pour revenir à imv : `xdg-mime default imv.desktop image/png`.
