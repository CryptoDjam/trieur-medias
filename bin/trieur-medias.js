#!/usr/bin/env node
// Lanceur npm du Trieur de médias : démarre le serveur Python (bibliothèque standard) et ouvre le navigateur.
// Usage : trieur-medias [--port 9170] [--no-browser] [--ouvrir <fichier ou dossier>]
'use strict';
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const port = get('--port') || process.env.TRIEUR_PORT || '9170';
const noBrowser = args.includes('--no-browser');
const ouvrir = get('--ouvrir');
if (args.includes('-h') || args.includes('--help')) {
  console.log('trieur-medias [--port 9170] [--no-browser] [--ouvrir <fichier|dossier>]\nTrieur de médias : page locale pour trier des fichiers (défiler, cocher, envoyer vers un dossier, corbeille).');
  process.exit(0);
}
const python = ['python3', 'python'].find(p => spawnSync(p, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0);
if (!python) { console.error('python3 (≥ 3.10) est requis.'); process.exit(1); }
const serveur = path.join(__dirname, '..', 'serveur.py');
const enfant = spawn(python, [serveur, '--port', String(port)], { stdio: 'inherit', env: { ...process.env, TRIEUR_PORT: String(port) } });
enfant.on('exit', code => process.exit(code ?? 0));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => enfant.kill(s));

let url = `http://127.0.0.1:${port}/`;
if (ouvrir) {
  const abs = path.resolve(ouvrir);
  const estDossier = fs.existsSync(abs) && fs.statSync(abs).isDirectory();
  const q = new URLSearchParams(estDossier ? { dossier: abs } : { dossier: path.dirname(abs), fichier: path.basename(abs) });
  url += '?' + q.toString();
}
console.log(`Trieur de médias : ${url}  (Ctrl-C pour arrêter)`);
if (!noBrowser) setTimeout(() => { const o = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'; spawn(o, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref(); }, 600);
