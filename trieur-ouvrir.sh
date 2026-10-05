#!/bin/bash
# Ouvre le Trieur de médias sur le dossier d'un fichier, ce fichier affiché (« Ouvrir avec » / fichier par défaut pour les PNG).
# Usage : trieur-ouvrir.sh /chemin/vers/image.png   (sans argument : le Trieur tel quel)
f="${1:-}"
if [ -n "$f" ]; then
  f="$(realpath -- "$f")"
  url="http://localhost:9170/?$(python3 -c 'import sys,urllib.parse,os;f=sys.argv[1];print(urllib.parse.urlencode({"dossier":os.path.dirname(f),"fichier":os.path.basename(f)}))' "$f")"
else
  url="http://localhost:9170/"
fi
systemctl --user is-active --quiet trieur-medias || systemctl --user start trieur-medias
exec omarchy-launch-webapp "$url"
