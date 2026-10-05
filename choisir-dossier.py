#!/usr/bin/env python3
"""Boîte de dialogue GTK « choisir un dossier » pour le Trieur. Imprime le chemin choisi (rien si annulé)."""
import os
import sys
from pathlib import Path

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk  # noqa: E402

depart = Path(os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~"))
if not depart.is_dir():
    depart = Path.home()
titre = (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else "Trieur — choisir un dossier")
dlg = Gtk.FileChooserDialog(title=titre, action=Gtk.FileChooserAction.SELECT_FOLDER)
dlg.add_buttons("Annuler", Gtk.ResponseType.CANCEL, "Choisir", Gtk.ResponseType.OK)
dlg.set_current_folder(str(depart))
dlg.set_default_size(820, 560)
dlg.set_position(Gtk.WindowPosition.CENTER)
for nom, chemin in (("Projets", "~/Projects"), ("Téléchargements", "~/Downloads"), ("Images", "~/Pictures")):
    p = Path(os.path.expanduser(chemin))
    if p.is_dir():
        try:
            dlg.add_shortcut_folder(str(p))
        except Exception:
            pass
reponse = dlg.run()
chemin = dlg.get_filename() if reponse == Gtk.ResponseType.OK else None
dlg.destroy()
if chemin:
    print(chemin)
