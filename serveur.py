#!/usr/bin/env python3
"""Trieur de médias (Gardien, 04/10/2026) : choisir un dossier du dossier personnel, faire défiler les fichiers,
cocher, envoyer la sélection à la corbeille système (gio trash, récupérable). Bibliothèque standard seulement.
127.0.0.1:9170.

  GET  /                      la page
  GET  /api/dossier?chemin=   contenu d'un dossier (sous-dossiers + fichiers avec type, taille, date)
  GET  /api/fichier?chemin=   le fichier (image servie telle quelle ; texte en text/plain)
  GET  /api/raccourcis        dossiers proposés
  GET  /api/choisir?depuis=&titre=   boîte de dialogue GTK « choisir un dossier » (popup), renvoie le chemin choisi
  POST /api/deplacer {chemins, dossier}  déplace les fichiers (+ .json jumeau d'une image) dans un dossier du dossier personnel, sans écraser
  POST /api/corbeille         {"chemins": [...]} → gio trash (jamais rm) ; le .json jumeau d'une image part avec
  GET/POST /api/notes?dossier= notes.json du dossier (prévu pour les listes de messages par média)
"""
import json
import os
import shutil
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("TRIEUR_PORT") or (sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else 9170))
ICI = Path(__file__).resolve().parent
PAGES = ICI / "pages"
MAISON = Path.home().resolve()
ORIGINES = {f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"}
IMAGES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".avif"}
TEXTES = {".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".log", ".html", ".css", ".js", ".py", ".sh"}
VIDEOS = {".mp4", ".webm", ".mov", ".mkv"}
TYPES_HTTP = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
              ".svg": "image/svg+xml", ".bmp": "image/bmp", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm",
              ".mov": "video/quicktime", ".mkv": "video/x-matroska"}
RACCOURCIS = [
    "~/Projects",
    "~/Downloads",
    "~/Pictures",
    "~/Documents",
]


def type_de(p: Path) -> str:
    s = p.suffix.lower()
    if s in IMAGES:
        return "image"
    if s in TEXTES:
        return "texte"
    if s in VIDEOS:
        return "video"
    return "autre"


def chemin_sur(chemin: str) -> Path | None:
    """Chemin résolu, seulement s'il reste dans le dossier personnel."""
    if not chemin:
        return None
    p = Path(os.path.expanduser(chemin)).resolve()
    try:
        p.relative_to(MAISON)
    except ValueError:
        return None
    return p


def contenu(d: Path) -> dict:
    dossiers, fichiers = [], []
    for e in sorted(d.iterdir(), key=lambda x: x.name.lower()):
        if e.name.startswith("."):
            continue
        if e.is_dir():
            dossiers.append(e.name)
        elif e.is_file():
            st = e.stat()
            fichiers.append({"nom": e.name, "chemin": str(e), "type": type_de(e), "taille": st.st_size, "modifie": int(st.st_mtime)})
    return {"dossier": str(d), "parent": str(d.parent) if d != MAISON else None, "dossiers": dossiers, "fichiers": fichiers}


def corbeille(chemins: list[str]) -> dict:
    envoyes, refuses = [], []
    for c in chemins:
        p = chemin_sur(c)
        if not p or not p.is_file():
            refuses.append(c)
            continue
        cibles = [p]
        if type_de(p) == "image":
            jumeau = p.with_suffix(".json")
            if jumeau.is_file():
                cibles.append(jumeau)
        for t in cibles:
            r = subprocess.run(["gio", "trash", str(t)], capture_output=True, text=True, timeout=30)
            (envoyes if r.returncode == 0 else refuses).append(str(t))
    return {"corbeille": envoyes, "refuses": refuses}


def deplacer(chemins: list[str], dest: str) -> dict:
    """Déplace des fichiers (et le .json jumeau d'une image) vers un dossier du dossier personnel. Jamais d'écrasement."""
    d = chemin_sur(dest)
    if not d or not d.is_dir():
        return {"error": "dossier d'arrivée refusé (hors du dossier personnel) ou introuvable", "deplaces": [], "refuses": chemins}
    deplaces, refuses = [], []
    for c in chemins:
        p = chemin_sur(c)
        if not p or not p.is_file() or p.parent == d:
            refuses.append(c)
            continue
        cibles = [p]
        if type_de(p) == "image":
            jumeau = p.with_suffix(".json")
            if jumeau.is_file():
                cibles.append(jumeau)
        if any((d / t.name).exists() for t in cibles):
            refuses.append(c)
            continue
        for t in cibles:
            try:
                shutil.move(str(t), str(d / t.name))
                deplaces.append(str(d / t.name))
            except OSError:
                refuses.append(str(t))
    return {"dossier": str(d), "deplaces": deplaces, "refuses": refuses}


class Trieur(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def repondre(self, code, corps, type_="application/json; charset=utf-8"):
        if isinstance(corps, (dict, list)):
            corps = json.dumps(corps, ensure_ascii=False).encode()
        elif isinstance(corps, str):
            corps = corps.encode()
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def params(self):
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def do_GET(self):
        p = urlparse(self.path).path
        q = self.params()
        if p in ("/", "/index.html"):
            return self.repondre(200, (PAGES / "index.html").read_bytes(), "text/html; charset=utf-8")
        if p in ("/app.js", "/style.css"):
            return self.repondre(200, (PAGES / p[1:]).read_bytes(), "text/javascript" if p.endswith(".js") else "text/css")
        # Cadre-signature, police CS Coque et image de fond : fichiers statiques de pages/calque/, polices/ et images/, rien d'autre
        if p.startswith(("/calque/", "/polices/", "/images/")):
            f = (PAGES / p[1:]).resolve()
            types = {".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8"}
            if PAGES.resolve() in f.parents and f.is_file() and f.suffix in types:
                return self.repondre(200, f.read_bytes(), types[f.suffix])
            return self.repondre(404, {"error": "introuvable"})
        if p == "/api/raccourcis":
            return self.repondre(200, [{"nom": r, "chemin": str(Path(os.path.expanduser(r))), "existe": Path(os.path.expanduser(r)).is_dir()} for r in RACCOURCIS])
        if p == "/api/choisir":
            depuis = chemin_sur(q.get("depuis", "~")) or MAISON
            try:
                r = subprocess.run([sys.executable, str(ICI / "choisir-dossier.py"), str(depuis), q.get("titre", "")[:80]], capture_output=True, text=True, timeout=180)
            except subprocess.TimeoutExpired:
                return self.repondre(200, {"annule": True})
            choisi = r.stdout.strip()
            if not choisi:
                return self.repondre(200, {"annule": True})
            d = chemin_sur(choisi)
            if not d or not d.is_dir():
                return self.repondre(403, {"error": "dossier refusé (hors du dossier personnel)"})
            return self.repondre(200, {"chemin": str(d)})
        if p == "/api/dossier":
            d = chemin_sur(q.get("chemin", "~"))
            if not d or not d.is_dir():
                return self.repondre(403, {"error": "dossier refusé (hors du dossier personnel) ou introuvable"})
            return self.repondre(200, contenu(d))
        if p == "/api/fichier":
            f = chemin_sur(q.get("chemin", ""))
            if not f or not f.is_file():
                return self.repondre(403, {"error": "fichier refusé"})
            t = type_de(f)
            if t == "texte":
                return self.repondre(200, f.read_bytes()[:400_000], "text/plain; charset=utf-8")
            if t in ("image", "video"):
                return self.repondre(200, f.read_bytes(), TYPES_HTTP.get(f.suffix.lower(), "application/octet-stream"))
            return self.repondre(415, {"error": "pas de prévisualisation pour ce type"})
        if p == "/api/notes":
            d = chemin_sur(q.get("dossier", ""))
            if not d or not d.is_dir():
                return self.repondre(403, {"error": "dossier refusé"})
            n = d / "notes.json"
            return self.repondre(200, json.loads(n.read_text()) if n.is_file() else {})
        self.repondre(404, {"error": "introuvable"})

    def do_POST(self):
        origine = self.headers.get("Origin")
        if origine and origine not in ORIGINES:
            return self.repondre(403, {"error": "origine refusée"})
        p = urlparse(self.path).path
        taille = int(self.headers.get("Content-Length") or 0)
        if taille > 2_000_000:
            return self.repondre(413, {"error": "trop gros"})
        try:
            donnees = json.loads(self.rfile.read(taille) or b"{}")
        except ValueError:
            return self.repondre(400, {"error": "JSON invalide"})
        if p == "/api/corbeille":
            chemins = donnees.get("chemins") or []
            if not isinstance(chemins, list) or len(chemins) > 500:
                return self.repondre(400, {"error": "liste de chemins attendue (500 max)"})
            return self.repondre(200, corbeille([str(c) for c in chemins]))
        if p == "/api/deplacer":
            chemins = donnees.get("chemins") or []
            if not isinstance(chemins, list) or len(chemins) > 500:
                return self.repondre(400, {"error": "liste de chemins attendue (500 max)"})
            r = deplacer([str(c) for c in chemins], str(donnees.get("dossier", "")))
            return self.repondre(403 if r.get("error") else 200, r)
        if p == "/api/notes":
            d = chemin_sur(str(donnees.get("dossier", "")))
            if not d or not d.is_dir():
                return self.repondre(403, {"error": "dossier refusé"})
            (d / "notes.json").write_text(json.dumps(donnees.get("notes") or {}, ensure_ascii=False, indent=1))
            return self.repondre(200, {"ok": True})
        self.repondre(404, {"error": "introuvable"})


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Trieur).serve_forever()
